import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../App';
import { initialState } from '../../logic/engine';
import { useAppStore } from '../../store/useAppStore';
import { GameScreen } from './GameScreen';

async function hydrated() {
  if (useAppStore.getState().hydrated) return;
  await new Promise<void>((resolve) => {
    const unsub = useAppStore.subscribe((s) => s.hydrated && (unsub(), resolve()));
  });
}

const playButton = () => screen.queryByRole('button', { name: 'Play' });

beforeEach(async () => {
  await hydrated();
  useAppStore.setState({ ...initialState(), event: null });
  useAppStore.getState().onboard('Pip');
});

describe('Play button', () => {
  it('shows whenever no focus session is running', async () => {
    render(<App />);
    expect(playButton()).toBeInTheDocument(); // idle

    await act(async () => useAppStore.getState().startFocus());
    expect(playButton()).toBeNull(); // focusing

    await act(async () => {
      // Finish the session: celebration shows, games wait.
      useAppStore.setState((s) => ({ active: { ...s.active!, endsAt: Date.now() - 1 } }));
      useAppStore.getState().tick();
    });
    expect(screen.getByText('Session complete!')).toBeInTheDocument();
    expect(playButton()).toBeNull();

    await act(async () => useAppStore.getState().dismissEvent());
    expect(screen.getByText('Start break')).toBeInTheDocument(); // break ready
    expect(playButton()).toBeInTheDocument();

    await act(async () => useAppStore.getState().startBreak());
    expect(playButton()).toBeInTheDocument(); // on a break
  });
});

describe('Game picker and screen', () => {
  it('opens a game from the picker and closes it with the X', async () => {
    render(<App />);
    fireEvent.click(playButton()!);
    expect(screen.getByRole('dialog', { name: 'Play with Pip' })).toBeInTheDocument();
    expect(screen.getAllByText('No score yet')).toHaveLength(2);
    fireEvent.click(screen.getByText('Memory match'));

    const game = await screen.findByRole('dialog', { name: 'Memory match' });
    expect(game).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close game' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Close game' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Memory match' })).toBeNull());
    expect(screen.getByText('Start Focus')).toBeInTheDocument();
  });

  it('closes with Escape or the back gesture', async () => {
    render(<App />);
    fireEvent.click(playButton()!);
    fireEvent.click(screen.getByText('Catch the treats'));
    await screen.findByRole('dialog', { name: 'Catch the treats' });
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Catch the treats' })).toBeNull(),
    );

    fireEvent.click(playButton()!);
    fireEvent.click(screen.getByText('Catch the treats'));
    await screen.findByRole('dialog', { name: 'Catch the treats' });
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.queryByRole('dialog', { name: 'Catch the treats' })).toBeNull();
  });

  it('shows the break countdown while playing during a break', async () => {
    useAppStore.setState({ pendingBreak: 'shortBreak' });
    useAppStore.getState().startBreak();
    render(<App />);
    fireEvent.click(playButton()!);
    fireEvent.click(screen.getByText('Catch the treats'));
    expect(await screen.findByTestId('game-break')).toHaveTextContent(/Break (05:00|04:59)/);
  });
});

describe('GameScreen scores', () => {
  it('saves finished games and reports new bests', () => {
    let finish: ((n: number) => boolean) | null = null;
    render(
      <GameScreen game="catch" now={Date.now()} onClose={() => {}}>
        {({ onFinish }) => {
          finish = onFinish;
          return null;
        }}
      </GameScreen>,
    );
    expect(screen.getByTestId('game-best')).toHaveTextContent('No score yet');
    let isBest = false;
    act(() => {
      isBest = finish!(25);
    });
    expect(isBest).toBe(true);
    expect(screen.getByTestId('game-best')).toHaveTextContent('Best: 25 points');
    act(() => {
      isBest = finish!(10);
    });
    expect(isBest).toBe(false);
    expect(useAppStore.getState().games.catch).toEqual({ best: 25, plays: 2 });
  });
});

describe('Game texts use the fox’s own name', () => {
  it('shows the chosen name, not a default', async () => {
    useAppStore.setState({ ...initialState(), event: null });
    useAppStore.getState().onboard('Biscuit');
    render(<App />);
    fireEvent.click(playButton()!);
    expect(screen.getByRole('dialog', { name: 'Play with Biscuit' })).toBeInTheDocument();
    expect(screen.getByText('Move Biscuit to catch falling berries.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Catch the treats'));
    expect(
      await screen.findByText('Drag anywhere to move Biscuit. You have 60 seconds.'),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\bPip\b/);
  });
});
