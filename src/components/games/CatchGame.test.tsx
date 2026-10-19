import { act, fireEvent, render, screen } from '@testing-library/react';
import { initialState } from '../../logic/engine';
import { useAppStore } from '../../store/useAppStore';
import { GameOverlay } from './Games';

const foxLeft = () => parseFloat(screen.getByTestId('catch-fox').style.left);

/** Run animation frames for `ms` of game time. */
async function play(ms: number) {
  for (let t = 0; t < ms; t += 500) {
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
  }
}

beforeEach(() => {
  useAppStore.setState({ ...initialState(), event: null, hydrated: true });
  useAppStore.getState().onboard('Pip');
  vi.useFakeTimers({
    toFake: [
      'Date',
      'performance',
      'setTimeout',
      'clearTimeout',
      'requestAnimationFrame',
      'cancelAnimationFrame',
    ],
  });
});

afterEach(() => vi.useRealTimers());

describe('Catch the treats', () => {
  it('plays a 60 second round and saves the score', async () => {
    render(<GameOverlay game="catch" now={Date.now()} onClose={() => {}} />);
    expect(screen.getByText('Drag anywhere to move Pip. You have 60 seconds.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByTestId('catch-time')).toHaveTextContent('1:00');
    await play(30_000);
    expect(screen.getByTestId('catch-time')).toHaveTextContent(/0:(30|29)/);
    await play(31_000);

    expect(screen.getByText('Time’s up!')).toBeInTheDocument();
    const score = Number(screen.getByTestId('catch-final').textContent);
    expect(useAppStore.getState().games.catch).toEqual({ best: score, plays: 1 });
    expect(screen.getByText('New best!')).toBeInTheDocument();
    expect(screen.getByTestId('game-best')).toHaveTextContent(`Best: ${score} points`);

    // Play again starts a fresh round.
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    expect(screen.getByTestId('catch-score')).toHaveTextContent('0');
    expect(screen.getByTestId('catch-time')).toHaveTextContent('1:00');
  });

  it('walks Pip with the arrow keys', async () => {
    render(<GameOverlay game="catch" now={Date.now()} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(foxLeft()).toBe(50);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await play(500);
    fireEvent.keyUp(window, { key: 'ArrowRight' });
    expect(foxLeft()).toBeGreaterThan(60);
    const right = foxLeft();
    fireEvent.keyDown(window, { key: 'a' });
    await play(500);
    expect(foxLeft()).toBeLessThan(right);
  });

  it('lets go of held keys when the window loses focus', async () => {
    render(<GameOverlay game="catch" now={Date.now()} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await play(250);
    fireEvent.blur(window);
    const x = foxLeft();
    await play(1_000);
    expect(foxLeft()).toBe(x);
  });

  it('does not grab the pointer before a round starts, so a mouse click reaches Start', () => {
    render(<GameOverlay game="catch" now={Date.now()} onClose={() => {}} />);
    const area = screen.getByTestId('catch-area');
    const capture = vi.fn();
    area.setPointerCapture = capture;
    // Pressing on the Start button bubbles a pointerdown up to the play area.
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Start' }), { pointerId: 1 });
    expect(capture).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.pointerDown(area, { pointerId: 1, clientX: 10 });
    expect(capture).toHaveBeenCalledWith(1);
  });

  it('moves Pip to where you drag', async () => {
    render(<GameOverlay game="catch" now={Date.now()} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    const area = screen.getByTestId('catch-area');
    area.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 500 }) as DOMRect;
    fireEvent.pointerDown(area, { clientX: 75, pointerId: 1 });
    await play(500);
    expect(foxLeft()).toBeCloseTo(25);
    fireEvent.pointerMove(area, { clientX: 0, pointerId: 1 });
    await play(500);
    expect(foxLeft()).toBeCloseTo(10); // kept inside the play area
  });

  it('does not save anything when closed mid-round', async () => {
    const { unmount } = render(<GameOverlay game="catch" now={Date.now()} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await play(10_000);
    unmount();
    expect(useAppStore.getState().games.catch).toEqual({ best: null, plays: 0 });
  });
});
