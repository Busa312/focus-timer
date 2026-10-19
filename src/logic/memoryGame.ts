/**
 * Memory match: pure game logic. 16 cards (8 pairs) shuffled face down; turn
 * over two per move. The score is the number of moves, fewer is better.
 */

export const MEMORY_FACES = [
  'glasses',
  'headphones',
  'beanie',
  'flowerCrown',
  'bowTie',
  'starCape',
  'berry',
  'golden',
] as const;

export type MemoryFace = (typeof MEMORY_FACES)[number];

export interface MemoryCard {
  face: MemoryFace;
  matched: boolean;
}

export interface MemoryState {
  cards: MemoryCard[];
  /** Indexes of face-up cards that aren't matched (0, 1 or 2). */
  flipped: number[];
  moves: number;
  startedAt: number | null;
  finishedAt: number | null;
}

/** Fewest possible moves: every pair found on the first try. */
export const MIN_MOVES = MEMORY_FACES.length;

export function newMemoryGame(rand: () => number): MemoryState {
  const cards: MemoryCard[] = [...MEMORY_FACES, ...MEMORY_FACES].map((face) => ({
    face,
    matched: false,
  }));
  // Fisher-Yates shuffle.
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return { cards, flipped: [], moves: 0, startedAt: null, finishedAt: null };
}

export const isComplete = (s: MemoryState) => s.cards.every((c) => c.matched);

/** Two face-up cards that didn't match, waiting to be turned back. */
export const isMismatchShowing = (s: MemoryState) => s.flipped.length === 2;

export const matchedPairs = (s: MemoryState) => s.cards.filter((c) => c.matched).length / 2;

/** Turn the shown mismatch back face down. */
export function hideMismatch(s: MemoryState): MemoryState {
  return isMismatchShowing(s) ? { ...s, flipped: [] } : s;
}

/**
 * Turn over the card at `index`. Tapping a new card while a mismatch is
 * showing hides the mismatch first, so play never has to wait.
 */
export function flip(state: MemoryState, index: number, now: number): MemoryState {
  let s = state;
  const card = s.cards[index];
  if (!card || card.matched || isComplete(s) || s.flipped.includes(index)) return s;
  if (isMismatchShowing(s)) s = hideMismatch(s);

  const startedAt = s.startedAt ?? now;
  if (s.flipped.length === 0) return { ...s, flipped: [index], startedAt };

  // Second card of a move.
  const first = s.flipped[0];
  const moves = s.moves + 1;
  if (s.cards[first].face !== card.face) {
    return { ...s, flipped: [first, index], moves, startedAt };
  }
  const cards = s.cards.map((c, i) => (i === first || i === index ? { ...c, matched: true } : c));
  const done = cards.every((c) => c.matched);
  return { ...s, cards, flipped: [], moves, startedAt, finishedAt: done ? now : null };
}

export function elapsedMs(s: MemoryState, now: number): number {
  if (s.startedAt === null) return 0;
  return (s.finishedAt ?? now) - s.startedAt;
}
