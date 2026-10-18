import type { CreatureState, Mood } from '../../types';

export type Eyes = 'sparkle' | 'round' | 'lidded' | 'droopy' | 'joy' | 'reading' | 'wide' | 'down';
export type Mouth = 'open' | 'w' | 'flat' | 'frown' | 'wavy' | 'small';
export type Motion =
  'bounce' | 'bob' | 'slowbob' | 'slump' | 'nod' | 'hop' | 'jump' | 'shiver' | 'sink';
export type Extra = 'hearts' | 'rain' | 'book' | 'ball' | 'confetti' | 'sweat';

export interface Expression {
  eyes: Eyes;
  mouth: Mouth;
  blush: boolean;
  brows: 'none' | 'sad' | 'worried';
  earsDown: boolean;
  motion: Motion;
  extras: Extra[];
  /** Blinking only makes sense for open eyes. */
  blink: boolean;
  /** Tail wag speed in seconds, or 0 for still. */
  wag: number;
}

const MOOD_FACE: Record<Mood, Expression> = {
  ecstatic: {
    eyes: 'sparkle',
    mouth: 'open',
    blush: true,
    brows: 'none',
    earsDown: false,
    motion: 'bounce',
    extras: ['hearts'],
    blink: true,
    wag: 0.6,
  },
  happy: {
    eyes: 'round',
    mouth: 'w',
    blush: true,
    brows: 'none',
    earsDown: false,
    motion: 'bob',
    extras: [],
    blink: true,
    wag: 1.4,
  },
  meh: {
    eyes: 'lidded',
    mouth: 'flat',
    blush: false,
    brows: 'none',
    earsDown: false,
    motion: 'slowbob',
    extras: [],
    blink: true,
    wag: 0,
  },
  sad: {
    eyes: 'droopy',
    mouth: 'frown',
    blush: false,
    brows: 'sad',
    earsDown: true,
    motion: 'slump',
    extras: ['rain'],
    blink: true,
    wag: 0,
  },
};

const STATE_FACE: Record<Exclude<CreatureState, 'idle'>, Expression> = {
  focused: {
    eyes: 'reading',
    mouth: 'small',
    blush: false,
    brows: 'none',
    earsDown: false,
    motion: 'nod',
    extras: ['book'],
    blink: false,
    wag: 3,
  },
  playing: {
    eyes: 'joy',
    mouth: 'open',
    blush: true,
    brows: 'none',
    earsDown: false,
    motion: 'hop',
    extras: ['ball'],
    blink: false,
    wag: 0.5,
  },
  celebrating: {
    eyes: 'joy',
    mouth: 'open',
    blush: true,
    brows: 'none',
    earsDown: false,
    motion: 'jump',
    extras: ['confetti'],
    blink: false,
    wag: 0.35,
  },
  disappointed: {
    eyes: 'down',
    mouth: 'frown',
    blush: false,
    brows: 'sad',
    earsDown: true,
    motion: 'sink',
    extras: [],
    blink: false,
    wag: 0,
  },
  worried: {
    eyes: 'wide',
    mouth: 'wavy',
    blush: false,
    brows: 'worried',
    earsDown: true,
    motion: 'shiver',
    extras: ['sweat'],
    blink: true,
    wag: 0,
  },
};

/** Short-lived states override the mood face. */
export function expressionFor(mood: Mood, state: CreatureState): Expression {
  return state === 'idle' ? MOOD_FACE[mood] : STATE_FACE[state];
}
