import { seededRandom } from './random';
import {
  elapsedMs,
  flip,
  hideMismatch,
  isComplete,
  isMismatchShowing,
  matchedPairs,
  MEMORY_FACES,
  MIN_MOVES,
  newMemoryGame,
  type MemoryState,
} from './memoryGame';

const T = 1_000_000;

/** Indexes of the two cards showing `face`. */
const pairOf = (s: MemoryState, face: string) =>
  s.cards.flatMap((c, i) => (c.face === face ? [i] : []));

/** Two indexes with different faces. */
function mismatch(s: MemoryState): [number, number] {
  const a = 0;
  const b = s.cards.findIndex((c) => c.face !== s.cards[a].face);
  return [a, b];
}

describe('Memory match: deck', () => {
  it('has 16 face-down cards, two of each of 8 faces', () => {
    const s = newMemoryGame(seededRandom(1));
    expect(s.cards).toHaveLength(16);
    for (const face of MEMORY_FACES) expect(pairOf(s, face)).toHaveLength(2);
    expect(s.cards.every((c) => !c.matched)).toBe(true);
    expect(s).toMatchObject({ flipped: [], moves: 0, startedAt: null, finishedAt: null });
  });

  it('shuffles differently per seed, the same for the same seed', () => {
    const order = (seed: number) =>
      newMemoryGame(seededRandom(seed))
        .cards.map((c) => c.face)
        .join();
    expect(order(1)).toBe(order(1));
    expect(order(1)).not.toBe(order(2));
  });
});

describe('Memory match: playing', () => {
  it('a matching pair stays face up and counts one move', () => {
    let s = newMemoryGame(seededRandom(3));
    const [a, b] = pairOf(s, 'beanie');
    s = flip(s, a, T);
    expect(s.flipped).toEqual([a]);
    expect(s.moves).toBe(0);
    s = flip(s, b, T + 500);
    expect(s.moves).toBe(1);
    expect(s.flipped).toEqual([]);
    expect(s.cards[a].matched && s.cards[b].matched).toBe(true);
    expect(matchedPairs(s)).toBe(1);
  });

  it('a mismatch shows both cards until hidden, and counts one move', () => {
    let s = newMemoryGame(seededRandom(3));
    const [a, b] = mismatch(s);
    s = flip(flip(s, a, T), b, T);
    expect(isMismatchShowing(s)).toBe(true);
    expect(s.flipped).toEqual([a, b]);
    expect(s.moves).toBe(1);
    s = hideMismatch(s);
    expect(s.flipped).toEqual([]);
    expect(s.cards.some((c) => c.matched)).toBe(false);
  });

  it('tapping a third card hides the mismatch and starts a new move', () => {
    let s = newMemoryGame(seededRandom(4));
    const [a, b] = mismatch(s);
    const c = s.cards.findIndex((_, i) => i !== a && i !== b);
    s = flip(flip(flip(s, a, T), b, T), c, T);
    expect(s.flipped).toEqual([c]);
    expect(s.moves).toBe(1);
  });

  it('ignores taps on matched cards and on the card already face up', () => {
    let s = newMemoryGame(seededRandom(5));
    const [a, b] = pairOf(s, 'golden');
    s = flip(flip(s, a, T), b, T);
    expect(flip(s, a, T)).toBe(s);
    const other = s.cards.findIndex((c) => !c.matched);
    s = flip(s, other, T);
    expect(flip(s, other, T)).toBe(s);
  });

  it('starts the clock on the first card and stops it when done', () => {
    let s = newMemoryGame(seededRandom(6));
    expect(elapsedMs(s, T + 5000)).toBe(0);
    for (const face of MEMORY_FACES) {
      const [a, b] = pairOf(s, face);
      s = flip(flip(s, a, T + 1000), b, T + 1000);
    }
    expect(isComplete(s)).toBe(true);
    expect(s.finishedAt).toBe(T + 1000);
    expect(elapsedMs(s, T + 99_999)).toBe(0);
  });

  it('a perfect game takes 8 moves', () => {
    let s = newMemoryGame(seededRandom(7));
    for (const face of MEMORY_FACES) {
      const [a, b] = pairOf(s, face);
      s = flip(flip(s, a, T), b, T);
    }
    expect(s.moves).toBe(MIN_MOVES);
    expect(isComplete(s)).toBe(true);
    // Nothing happens after the board is cleared.
    expect(flip(s, 0, T)).toBe(s);
  });

  it('a player with no memory takes many more moves than a perfect one', () => {
    const rand = seededRandom(8);
    let s = newMemoryGame(rand);
    let guard = 0;
    while (!isComplete(s) && guard++ < 10_000) {
      const open = s.cards.flatMap((c, i) => (c.matched ? [] : [i]));
      const a = open[Math.floor(rand() * open.length)];
      const rest = open.filter((i) => i !== a);
      const b = rest[Math.floor(rand() * rest.length)];
      s = hideMismatch(flip(flip(s, a, T), b, T));
    }
    expect(isComplete(s)).toBe(true);
    expect(s.moves).toBeGreaterThan(MIN_MOVES * 2);
  });
});
