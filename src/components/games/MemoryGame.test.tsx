import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { initialState } from '../../logic/engine';
import { MEMORY_FACES, newMemoryGame } from '../../logic/memoryGame';
import { useAppStore } from '../../store/useAppStore';
import { playGameSound } from '../../lib/sound';
import { GameOverlay } from './Games';

vi.mock('../../lib/sound', () => ({
  playGameSound: vi.fn(),
  playChime: vi.fn(),
  unlockAudio: vi.fn(),
}));

// Math.random() = 0 gives a fixed deck, which the test can rebuild to know where pairs are.
const deck = newMemoryGame(() => 0).cards.map((c) => c.face);
const pairs = MEMORY_FACES.map((f) => deck.flatMap((face, i) => (face === f ? [i] : [])));

const cards = () => within(screen.getByTestId('memory-board')).getAllByRole('button');
const tap = (i: number) => fireEvent.click(cards()[i]);

beforeEach(() => {
  useAppStore.setState({ ...initialState(), event: null, hydrated: true });
  useAppStore.getState().onboard('Pip');
  vi.spyOn(Math, 'random').mockReturnValue(0);
  vi.useFakeTimers({
    toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Memory match', () => {
  it('shows 16 hidden cards', () => {
    render(<GameOverlay game="memory" now={Date.now()} onClose={() => {}} />);
    expect(cards()).toHaveLength(16);
    expect(cards()[0]).toHaveAccessibleName('Card 1, hidden');
    expect(screen.getByTestId('memory-pairs')).toHaveTextContent('0/8');
  });

  it('a perfect game takes 8 moves and saves the best score', () => {
    render(<GameOverlay game="memory" now={Date.now()} onClose={() => {}} />);
    for (const [a, b] of pairs) {
      tap(a);
      act(() => vi.advanceTimersByTime(1_000));
      tap(b);
    }
    expect(screen.getByText('All pairs found!')).toBeInTheDocument();
    expect(screen.getByTestId('memory-final')).toHaveTextContent('8');
    expect(screen.getByText('moves · 0:08')).toBeInTheDocument();
    expect(screen.getByText('New best!')).toBeInTheDocument();
    expect(useAppStore.getState().games.memory).toEqual({ best: 8, plays: 1 });
    expect(screen.getByRole('button', { name: 'Play again' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    expect(screen.getByTestId('memory-moves')).toHaveTextContent('0');
    expect(cards().every((c) => /hidden/.test(c.getAttribute('aria-label')!))).toBe(true);
  });

  it('turns a mismatch back over after a moment', () => {
    render(<GameOverlay game="memory" now={Date.now()} onClose={() => {}} />);
    const [a] = pairs[0];
    const [b] = pairs[1];
    tap(a);
    tap(b);
    expect(cards()[a].getAttribute('aria-label')).not.toMatch(/hidden/);
    expect(screen.getByTestId('memory-moves')).toHaveTextContent('1');
    act(() => vi.advanceTimersByTime(950));
    expect(cards()[a]).toHaveAccessibleName(`Card ${a + 1}, hidden`);
    expect(cards()[b]).toHaveAccessibleName(`Card ${b + 1}, hidden`);
  });

  it('keeps matched cards face up and ignores taps on them', () => {
    render(<GameOverlay game="memory" now={Date.now()} onClose={() => {}} />);
    const [a, b] = pairs[2];
    tap(a);
    tap(b);
    expect(cards()[a].getAttribute('aria-label')).toMatch(/matched$/);
    tap(a);
    expect(screen.getByTestId('memory-moves')).toHaveTextContent('1');
    expect(screen.getByTestId('memory-pairs')).toHaveTextContent('1/8');
  });

  it('runs the clock from the first card', () => {
    render(<GameOverlay game="memory" now={Date.now()} onClose={() => {}} />);
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByTestId('memory-time')).toHaveTextContent('0:00');
    tap(0);
    act(() => vi.advanceTimersByTime(3_000));
    expect(screen.getByTestId('memory-time')).toHaveTextContent('0:03');
  });

  it('plays soft sounds and announces pairs for screen readers', () => {
    vi.mocked(playGameSound).mockClear();
    render(<GameOverlay game="memory" now={Date.now()} onClose={() => {}} />);
    const announce = screen.getByTestId('memory-announce');
    tap(pairs[0][0]);
    tap(pairs[1][0]);
    expect(announce).toHaveTextContent('No match');
    act(() => vi.advanceTimersByTime(950));
    for (const [a, b] of pairs) {
      tap(a);
      tap(b);
    }
    expect(announce).toHaveTextContent('All pairs found in 9 moves');
    const sounds = vi.mocked(playGameSound).mock.calls.map(([s]) => s);
    expect(sounds.filter((s) => s === 'match')).toHaveLength(7);
    expect(sounds.at(-1)).toBe('win');
  });

  it('stays silent when Sound is off', () => {
    vi.mocked(playGameSound).mockClear();
    useAppStore.getState().updateSettings({ soundOn: false });
    render(<GameOverlay game="memory" now={Date.now()} onClose={() => {}} />);
    for (const [a, b] of pairs) {
      tap(a);
      tap(b);
    }
    expect(screen.getByText('All pairs found!')).toBeInTheDocument();
    expect(playGameSound).not.toHaveBeenCalled();
  });
});
