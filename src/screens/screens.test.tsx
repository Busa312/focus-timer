import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

const nav = (name: string) =>
  fireEvent.click(within(screen.getByRole('navigation')).getByText(name));

beforeEach(async () => {
  await hydrated();
  useAppStore.setState({ ...initialState(), event: null });
  useAppStore.getState().onboard('Pip');
});

describe('Settings', () => {
  it('changes the timer lengths after Save', () => {
    render(<App />);
    expect(screen.getByTestId('clock')).toHaveTextContent('25:00');
    nav('Settings');
    expect(screen.queryByLabelText('Focus')).toBeNull(); // Classic has fixed lengths
    fireEvent.click(screen.getByRole('radio', { name: /Custom/ }));
    fireEvent.click(screen.getByLabelText('Increase Focus'));
    expect(screen.getByLabelText('Focus')).toHaveValue(30);
    fireEvent.change(screen.getByLabelText('Short break'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Sound' }));
    // Nothing applies until Save.
    expect(useAppStore.getState().settings.focusMin).toBe(25);
    fireEvent.click(screen.getByText('Save'));
    expect(screen.getByRole('status')).toHaveTextContent('Saved.');
    expect(useAppStore.getState().settings).toMatchObject({
      presetId: 'custom',
      focusMin: 30,
      shortBreakMin: 7,
      soundOn: false,
    });
    fireEvent.click(screen.getAllByText('Back')[0]);
    expect(screen.getByTestId('clock')).toHaveTextContent('30:00');
    fireEvent.click(screen.getByText('Start Focus'));
    const a = useAppStore.getState().active!;
    expect(a.endsAt - a.startedAt).toBe(30 * 60_000);
  });

  it('clamps values to their limits', () => {
    render(<App />);
    nav('Settings');
    fireEvent.click(screen.getByRole('radio', { name: /Custom/ }));
    const grace = screen.getByLabelText('Grace period');
    fireEvent.change(grace, { target: { value: '999' } });
    fireEvent.blur(grace);
    expect(grace).toHaveValue(60);
  });

  it('never lets users set focus below 25 minutes', () => {
    render(<App />);
    nav('Settings');
    fireEvent.click(screen.getByRole('radio', { name: /Custom/ }));
    const focus = screen.getByLabelText('Focus');
    expect(focus).toHaveValue(25);
    expect(screen.getByLabelText('Decrease Focus')).toBeDisabled();

    fireEvent.change(focus, { target: { value: '10' } });
    fireEvent.blur(focus);
    expect(focus).toHaveValue(25);
    fireEvent.change(focus, { target: { value: '0' } });
    fireEvent.keyDown(focus, { key: 'Enter' });
    expect(focus).toHaveValue(25);
    fireEvent.click(screen.getByText('Save'));
    expect(useAppStore.getState().settings.focusMin).toBeGreaterThanOrEqual(25);

    // Typing "30" passes through "3" without being clamped to 25 first.
    fireEvent.change(focus, { target: { value: '3' } });
    fireEvent.change(focus, { target: { value: '30' } });
    fireEvent.blur(focus);
    expect(focus).toHaveValue(30);
    fireEvent.click(screen.getByText('Save'));
    expect(useAppStore.getState().settings.focusMin).toBe(30);
  });

  it('offers a dev-only fast mode', () => {
    render(<App />);
    nav('Settings');
    fireEvent.click(screen.getByText(/Fast mode/));
    fireEvent.click(screen.getByText('Save'));
    expect(useAppStore.getState().settings.focusMin).toBe(1);
    expect(useAppStore.getState().settings.shortBreakMin * 60).toBeCloseTo(10);
  });

  it('reset asks first, then clears everything back to onboarding', () => {
    useAppStore.setState({
      history: [{ id: 'h', startedAt: 0, endedAt: 1, focusMinutes: 25, result: 'completed' }],
    });
    render(<App />);
    nav('Settings');
    fireEvent.click(screen.getByText('Reset all data'));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Reset everything?');
    expect(screen.getByText('Cancel')).toHaveFocus();
    fireEvent.click(screen.getByText('Cancel'));
    expect(useAppStore.getState().creature).not.toBeNull();

    fireEvent.click(screen.getByText('Reset all data'));
    fireEvent.click(screen.getByText('Delete everything'));
    const s = useAppStore.getState();
    expect(s.creature).toBeNull();
    expect(s.history).toEqual([]);
    expect(screen.getByText('Name your fox')).toBeInTheDocument();

    // A fresh start lands on Home.
    fireEvent.change(screen.getByPlaceholderText('e.g. Pip'), { target: { value: 'Mo' } });
    fireEvent.click(screen.getByText("Let's start"));
    expect(screen.getByText('Start Focus')).toBeInTheDocument();
  });
});

describe('Stats', () => {
  it('shows totals, streak, XP to next stage and the last 7 days', () => {
    const now = Date.now();
    useAppStore.setState((s) => ({
      creature: { ...s.creature!, xp: 100 },
      streak: { current: 3, best: 5, lastCompletedDate: null },
      history: [
        {
          id: 'a',
          startedAt: now - 3e6,
          endedAt: now - 1.5e6,
          focusMinutes: 25,
          result: 'completed',
        },
        { id: 'b', startedAt: now - 1e6, endedAt: now, focusMinutes: 50, result: 'completed' },
        {
          id: 'c',
          startedAt: now - 2e5,
          endedAt: now - 1e5,
          focusMinutes: 3,
          result: 'abandoned',
          abandonReason: 'gaveUp',
        },
      ],
    }));
    render(<App />);
    nav('Stats');
    expect(screen.getByText('Total focus').parentElement).toHaveTextContent('1h 15m');
    expect(screen.getByText('1 abandoned')).toBeInTheDocument();
    expect(screen.getByText('3 days')).toBeInTheDocument();
    expect(screen.getByText('Best: 5')).toBeInTheDocument();
    expect(screen.getByText('25 XP to Kid')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(8);
    expect(within(table).getAllByText('1h 15m')).toHaveLength(1);
    fireEvent.click(screen.getByLabelText('Back'));
    expect(screen.getByText('Start Focus')).toBeInTheDocument();
  });
});

describe('PresetPicker on Home', () => {
  it('picks a preset and locks during a session', () => {
    render(<App />);
    const chip = screen.getByRole('button', { name: /Timer preset: Classic/ });
    fireEvent.click(chip);
    fireEvent.click(screen.getByRole('radio', { name: /Deep/ }));
    expect(useAppStore.getState().settings.presetId).toBe('deep');
    expect(screen.getByTestId('clock')).toHaveTextContent('50:00');
    fireEvent.click(screen.getByText('Start Focus'));
    expect(screen.getByRole('button', { name: /Timer preset: Deep \(locked/ })).toBeDisabled();
  });

  it('shows Marathon as 1:30:00', () => {
    useAppStore.getState().updateSettings({ presetId: 'marathon' });
    render(<App />);
    expect(screen.getByTestId('clock')).toHaveTextContent('1:30:00');
  });
});

describe('Labels flow', () => {
  it('creates a label, tags a session with it, and shows it in Stats', () => {
    render(<App />);
    // Picker starts empty and links to label management.
    fireEvent.click(screen.getByRole('button', { name: 'Label: No label' }));
    fireEvent.click(screen.getByText('Create a label'));
    expect(screen.getByRole('heading', { name: 'Labels' })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('e.g. Study'), { target: { value: 'Study' } });
    fireEvent.click(screen.getByText('Add label'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Study'), { target: { value: 'Work' } });
    fireEvent.click(screen.getByText('Add label'));
    expect(screen.getByText('Your labels · 2 / 12')).toBeInTheDocument();

    // Duplicate names are rejected with a message.
    fireEvent.change(screen.getByPlaceholderText('e.g. Study'), { target: { value: 'study' } });
    fireEvent.click(screen.getByText('Add label'));
    expect(screen.getByRole('alert')).toHaveTextContent('already have a label');

    nav('Fox');
    fireEvent.click(screen.getByRole('button', { name: 'Label: No label' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Study' }));
    expect(screen.getByRole('button', { name: 'Label: Study' })).toBeInTheDocument();

    // Complete a session with that label.
    const studyId = useAppStore.getState().labels[0].id;
    fireEvent.click(screen.getByText('Start Focus'));
    expect(useAppStore.getState().active!.labelId).toBe(studyId);
    expect(screen.getByRole('button', { name: /Label: Study \(locked/ })).toBeDisabled();
    // Jump the whole session 25 min into the past so it is due now.
    const shift = 25 * 60_000;
    useAppStore.setState((s) => ({
      active: {
        ...s.active!,
        startedAt: s.active!.startedAt - shift,
        endsAt: s.active!.endsAt - shift,
      },
    }));
    useAppStore.getState().tick();
    expect(useAppStore.getState().history[0].labelId).toBe(studyId);

    nav('Stats');
    const rows = screen.getByTestId('label-rows');
    expect(within(rows).getByText('Study')).toBeInTheDocument();
    expect(within(rows).getByText('25m')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: '30 days' }));
    expect(within(screen.getByTestId('label-rows')).getByText('Study')).toBeInTheDocument();
  });

  it('archived labels leave the picker but keep their history in Stats', () => {
    useAppStore.getState().addLabel('Study', '#f7a8b8');
    const id = useAppStore.getState().labels[0].id;
    useAppStore.setState((s) => ({
      settings: { ...s.settings, lastLabelId: id },
      history: [
        {
          id: 'h',
          startedAt: Date.now() - 2e6,
          endedAt: Date.now() - 5e5,
          focusMinutes: 25,
          result: 'completed',
          labelId: id,
        },
      ],
    }));
    render(<App />);
    nav('Settings');
    fireEvent.click(screen.getByText('Labels'));
    fireEvent.click(screen.getByText('Archive'));
    expect(screen.getByText('Archived')).toBeInTheDocument();

    nav('Fox');
    expect(screen.getByRole('button', { name: 'Label: No label' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Label: No label' }));
    expect(screen.queryByRole('radio', { name: 'Study' })).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });

    nav('Stats');
    const row = within(screen.getByTestId('label-rows')).getByText('Study').closest('li')!;
    expect(row).toHaveTextContent('archived');
    expect(row).toHaveTextContent('25m');
  });

  it('renames a label inline', () => {
    useAppStore.getState().addLabel('Study', '#f7a8b8');
    render(<App />);
    nav('Settings');
    fireEvent.click(screen.getByText('Labels'));
    const input = screen.getByLabelText('Name of Study');
    fireEvent.change(input, { target: { value: 'Reading' } });
    fireEvent.blur(input);
    expect(useAppStore.getState().labels[0].name).toBe('Reading');
  });
});

describe('Wardrobe and unlock moment', () => {
  it('celebrates an unlock once after the session, with Equip now', () => {
    vi.useFakeTimers({
      toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
    });
    try {
      // 9 completed sessions already: the next one earns the glasses.
      useAppStore.setState((s) => ({
        creature: { ...s.creature!, xp: 30, hatchedAt: 1 },
        history: Array.from({ length: 9 }, (_, i) => ({
          id: `h${i}`,
          startedAt: i,
          endedAt: i + 1,
          focusMinutes: 1,
          result: 'completed' as const,
        })),
      }));
      render(<App />);
      fireEvent.click(screen.getByText('Start Focus'));
      act(() => {
        vi.advanceTimersByTime(25 * 60_000 + 500);
      });
      // Celebration first; the unlock waits.
      expect(screen.getByText('Session complete!')).toBeInTheDocument();
      expect(screen.queryByText('New: glasses!')).toBeNull();
      act(() => {
        vi.advanceTimersByTime(3_100);
      });
      expect(screen.getByRole('dialog', { name: 'New: glasses!' })).toBeInTheDocument();
      fireEvent.click(screen.getByText('Equip now'));
      expect(useAppStore.getState().wardrobe.equipped).toBe('glasses');
      expect(screen.queryByText('New: glasses!')).toBeNull();
      expect(useAppStore.getState().wardrobe.seenUnlocks).toEqual(['accessory:glasses']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows locked items with how to earn them, and equips unlocked ones', () => {
    useAppStore.setState((s) => ({
      creature: { ...s.creature!, xp: 30 },
      wardrobe: {
        ...s.wardrobe,
        unlockedAccessories: ['none', 'beanie'],
        unlockedColors: ['red', 'silver'],
        seenUnlocks: ['accessory:beanie', 'color:silver'],
      },
    }));
    render(<App />);
    nav('Wardrobe');
    const glasses = screen.getByRole('radio', {
      name: /Glasses, locked: 10 completed sessions \(0 \/ 10\)/,
    });
    fireEvent.click(glasses);
    expect(screen.getByRole('status')).toHaveTextContent('Glasses: 10 completed sessions (0 / 10)');
    expect(useAppStore.getState().wardrobe.equipped).toBe('none');

    fireEvent.click(screen.getByRole('radio', { name: 'Beanie' }));
    expect(useAppStore.getState().wardrobe.equipped).toBe('beanie');
    fireEvent.click(screen.getByRole('radio', { name: 'Silver' }));
    expect(useAppStore.getState().wardrobe.color).toBe('silver');
    expect(
      screen.getByRole('radio', { name: /Midnight, locked: Reach Adult stage/ }),
    ).toBeInTheDocument();

    nav('Fox');
    const fox = screen.getAllByRole('img').find((el) => el.getAttribute('data-stage'))!;
    expect(fox.querySelector('[data-acc="beanie"]')).not.toBeNull();
  });
});
