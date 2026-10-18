import { act, fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { initialState } from '../logic/engine';
import { useAppStore } from '../store/useAppStore';

async function hydrated() {
  if (useAppStore.getState().hydrated) return;
  await new Promise<void>((resolve) => {
    const unsub = useAppStore.subscribe((s) => {
      if (s.hydrated) {
        unsub();
        resolve();
      }
    });
  });
}

let visibility: DocumentVisibilityState = 'visible';
Object.defineProperty(document, 'visibilityState', {
  configurable: true,
  get: () => visibility,
});

function setVisible(v: boolean) {
  visibility = v ? 'visible' : 'hidden';
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

/** Time passes while hidden: timers are frozen, only the clock moves. */
function awayFor(ms: number) {
  vi.setSystemTime(Date.now() + ms);
}

const advance = async (ms: number) => {
  for (let t = 0; t < ms; t += 250) {
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
  }
};

describe('leave detection', () => {
  beforeEach(async () => {
    visibility = 'visible';
    await hydrated();
    useAppStore.setState({ ...initialState(), event: null });
    useAppStore.getState().onboard('Pip');
    vi.useFakeTimers({
      toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('forgives switching away for under 10 s', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Start Focus'));
    await advance(60_000);
    setVisible(false);
    expect(useAppStore.getState().active!.hiddenAt).not.toBeNull();
    awayFor(5_000);
    setVisible(true);
    expect(screen.getByText("Phew, you're back!")).toBeInTheDocument();
    expect(useAppStore.getState().active).not.toBeNull();
    expect(useAppStore.getState().creature!.happiness).toBe(70);
    // Timer stayed accurate: 25:00 - 1:00 - 0:05 away.
    await advance(250);
    expect(screen.getByTestId('clock')).toHaveTextContent('23:55');
  });

  it('abandons after more than 10 s away', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Start Focus'));
    await advance(60_000);
    setVisible(false);
    awayFor(15_000);
    setVisible(true);
    const s = useAppStore.getState();
    expect(s.active).toBeNull();
    expect(s.creature!.happiness).toBe(55);
    expect(s.history[0]).toMatchObject({ result: 'abandoned', abandonReason: 'leftApp' });
    expect(screen.getByText(/You left for a while/)).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('data-state', 'disappointed');
    await advance(4_000);
    expect(screen.queryByText(/You left for a while/)).not.toBeInTheDocument();
  });

  it('shows the fox as worried while hidden', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Start Focus'));
    setVisible(false);
    expect(screen.getByRole('img')).toHaveAttribute('data-state', 'worried');
  });

  it('counts a session that finished while away as completed', async () => {
    useAppStore.getState().updateSettings({ presetId: 'custom', focusMin: 1 });
    render(<App />);
    fireEvent.click(screen.getByText('Start Focus'));
    await advance(58_000);
    setVisible(false);
    awayFor(60_000);
    setVisible(true);
    expect(screen.getByText('Session complete!')).toBeInTheDocument();
    expect(useAppStore.getState().creature!.xp).toBe(1);
  });

  it('does not penalize leaving while paused or during a break', async () => {
    useAppStore.getState().updateSettings({ presetId: 'custom', focusMin: 1 });
    render(<App />);
    fireEvent.click(screen.getByText('Start Focus'));
    fireEvent.click(screen.getByText('Pause'));
    setVisible(false);
    awayFor(10 * 60_000);
    setVisible(true);
    expect(useAppStore.getState().active!.pausedAt).not.toBeNull();
    expect(useAppStore.getState().creature!.happiness).toBe(70);

    fireEvent.click(screen.getByText('Resume'));
    await advance(63_500);
    expect(screen.getByTestId('phase')).toHaveTextContent('Short break');
    setVisible(false);
    awayFor(2 * 60_000);
    setVisible(true);
    expect(useAppStore.getState().creature!.happiness).toBe(80);
  });

  it('saves lastSeenAt every 5 s while visible', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Start Focus'));
    const start = useAppStore.getState().active!.lastSeenAt;
    await advance(5_000);
    expect(useAppStore.getState().active!.lastSeenAt).toBe(start + 5_000);
  });
});

describe('wake lock', () => {
  const release = vi.fn();
  const request = vi.fn();

  beforeEach(async () => {
    visibility = 'visible';
    await hydrated();
    useAppStore.setState({ ...initialState(), event: null });
    useAppStore.getState().onboard('Pip');
    release.mockReset();
    request.mockReset().mockImplementation(async () => {
      const target = new EventTarget() as WakeLockSentinel;
      Object.assign(target, {
        released: false,
        release: async () => {
          release();
          Object.assign(target, { released: true });
        },
      });
      return target;
    });
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request },
    });
  });

  afterEach(() => {
    // @ts-expect-error test cleanup
    delete navigator.wakeLock;
  });

  it('holds the screen on during focus and releases on pause', async () => {
    render(<App />);
    expect(request).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByText('Start Focus')));
    expect(request).toHaveBeenCalledWith('screen');
    await act(async () => fireEvent.click(screen.getByText('Pause')));
    expect(release).toHaveBeenCalledTimes(1);
    await act(async () => fireEvent.click(screen.getByText('Resume')));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('re-requests the lock when the page becomes visible again', async () => {
    render(<App />);
    await act(async () => fireEvent.click(screen.getByText('Start Focus')));
    expect(request).toHaveBeenCalledTimes(1);
    // The browser drops the lock when hidden.
    const sentinel = (await request.mock.results[0].value) as WakeLockSentinel;
    Object.assign(sentinel, { released: true });
    setVisible(false);
    await act(async () => setVisible(true));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does not request when keep screen on is off', async () => {
    useAppStore.getState().updateSettings({ keepScreenOn: false });
    render(<App />);
    await act(async () => fireEvent.click(screen.getByText('Start Focus')));
    expect(request).not.toHaveBeenCalled();
  });

  it('shows a one-time tip when wake lock is unsupported', async () => {
    // @ts-expect-error simulate missing API
    delete navigator.wakeLock;
    localStorage.clear();
    render(<App />);
    fireEvent.click(screen.getByText('Start Focus'));
    expect(screen.getByText('Keep this screen open while you focus.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Got it'));
    fireEvent.click(screen.getByText('Give up'));
    fireEvent.click(screen.getAllByText('Give up').at(-1)!);
    fireEvent.click(screen.getByText('Start Focus'));
    expect(screen.queryByText('Keep this screen open while you focus.')).not.toBeInTheDocument();
  });
});
