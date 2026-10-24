import { act, fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { initialState } from './logic/engine';
import { useAppStore } from './store/useAppStore';

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

/**
 * Advance fake time. Small steps let intervals and effects interleave like real
 * time; long stretches can use bigger steps (the 250 ms ticker still fires inside).
 */
const advance = async (ms: number, stepMs = 250) => {
  for (let t = 0; t < ms; t += stepMs) {
    await act(async () => {
      vi.advanceTimersByTime(Math.min(stepMs, ms - t));
    });
  }
};

describe('App', () => {
  beforeEach(async () => {
    await hydrated();
    useAppStore.setState({ ...initialState(), event: null });
    vi.useFakeTimers({
      toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks for a name on first run', () => {
    render(<App />);
    expect(screen.getByText('Name your fox')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('e.g. Pip'), { target: { value: 'Pip' } });
    fireEvent.click(screen.getByText("Let's start"));
    expect(screen.getByText('Pip')).toBeInTheDocument();
    expect(screen.getByText('Start Focus')).toBeInTheDocument();
  });

  it('runs a full 4-session cycle with fast settings (1 min / 10 s)', async () => {
    useAppStore.getState().onboard('Pip');
    useAppStore.getState().updateSettings({
      presetId: 'custom',
      focusMin: 1,
      shortBreakMin: 10 / 60,
      longBreakMin: 10 / 60,
    });
    render(<App />);

    for (let i = 1; i <= 4; i++) {
      fireEvent.click(screen.getByText('Start Focus'));
      expect(screen.getByTestId('phase')).toHaveTextContent('Focus');
      await advance(30_000);
      expect(screen.getByTestId('clock')).toHaveTextContent('00:30');
      expect(document.title).toBe('00:30 · Focus');
      await advance(30_000);

      // Celebration overlay, then the break auto-starts after 3 s.
      expect(screen.getByText('Session complete!')).toBeInTheDocument();
      expect(screen.getByText('+1 XP')).toBeInTheDocument();
      await advance(3_000);
      expect(screen.queryByText('Session complete!')).not.toBeInTheDocument();
      if (i === 4) {
        // 4 XP: the egg hatches before the long break.
        expect(screen.getByText('Something is happening...')).toBeInTheDocument();
        await advance(2_000);
        fireEvent.click(screen.getByText('Continue'));
      }
      const expectedBreak = i === 4 ? 'Long break' : 'Short break';
      expect(screen.getByTestId('phase')).toHaveTextContent(expectedBreak);
      expect(screen.getByTestId('dots')).toHaveAccessibleName(
        `${i === 4 ? 4 : i} of 4 sessions this cycle`,
      );

      await advance(10_000);
      expect(screen.getByText('Start Focus')).toBeInTheDocument();
    }

    const s = useAppStore.getState();
    expect(s.cycleCount).toBe(0);
    expect(s.creature!.xp).toBe(4);
    expect(s.history.filter((h) => h.result === 'completed')).toHaveLength(4);
    // 70 + 10 + 10 + 10 + 15, clamped
    expect(s.creature!.happiness).toBe(100);
    expect(screen.getByTestId('dots')).toHaveAccessibleName('0 of 4 sessions this cycle');
  }, 20_000);

  it('hatches through the evolution moment without spoiling the new stage', async () => {
    useAppStore.getState().onboard('Pip');
    render(<App />);
    fireEvent.click(screen.getByText('Start Focus'));
    await advance(25 * 60_000, 1_000);
    expect(screen.getByText('Session complete!')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /egg fox/ })).toBeInTheDocument();
    expect(screen.queryByText('Start break')).not.toBeInTheDocument();
    await advance(3_000);
    expect(screen.getByText('Something is happening...')).toBeInTheDocument();
    await advance(2_000);
    expect(screen.getByText('Pip hatched!')).toBeInTheDocument();
    // The break waits for Continue.
    expect(useAppStore.getState().active).toBeNull();
    fireEvent.click(screen.getByText('Continue'));
    expect(useAppStore.getState().active?.phase).toBe('shortBreak');
    expect(screen.getByRole('img', { name: /baby fox/ })).toBeInTheDocument();
  }, 20_000);

  it('pause freezes the clock and resume continues', async () => {
    useAppStore.getState().onboard('Pip');
    render(<App />);
    fireEvent.click(screen.getByText('Start Focus'));
    await advance(5_000);
    fireEvent.click(screen.getByText('Pause'));
    await advance(60_000);
    expect(screen.getByTestId('clock')).toHaveTextContent('24:55');
    expect(screen.getByTestId('phase')).toHaveTextContent('Paused');
    fireEvent.click(screen.getByText('Resume'));
    await advance(5_000);
    expect(screen.getByTestId('clock')).toHaveTextContent('24:50');
  });

  it('give up asks for confirmation with Cancel focused, then applies the penalty', async () => {
    useAppStore.getState().onboard('Pip');
    render(<App />);
    fireEvent.click(screen.getByText('Start Focus'));
    fireEvent.click(screen.getByText('Give up'));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Give up? Pip will be sad');
    expect(screen.getByText('Keep going')).toHaveFocus();
    fireEvent.click(screen.getByText('Keep going'));
    expect(useAppStore.getState().active).not.toBeNull();

    fireEvent.click(screen.getByText('Give up'));
    fireEvent.click(screen.getAllByText('Give up').at(-1)!);
    const s = useAppStore.getState();
    expect(s.active).toBeNull();
    expect(s.creature!.happiness).toBe(55);
    expect(s.creature!.xp).toBe(0);
  });

  it('skip break returns to idle', async () => {
    useAppStore.getState().onboard('Pip');
    useAppStore
      .getState()
      .updateSettings({ presetId: 'custom', focusMin: 1, autoStartBreaks: false });
    render(<App />);
    fireEvent.click(screen.getByText('Start Focus'));
    await advance(63_000);
    expect(screen.getByText('Start break')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Skip break'));
    expect(screen.getByText('Start Focus')).toBeInTheDocument();
  });
});
