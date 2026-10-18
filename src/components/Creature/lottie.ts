import type { CreatureState, Mood } from '../../types';

/**
 * Lottie animations live in src/assets/lottie/<key>.json. Any file that exists
 * is used for its state; missing ones fall back to the SVG + CSS fox. Files are
 * code-split, and lottie-web itself only loads once a file is present.
 */
export type LottieKey =
  'idle' | 'sad' | 'focused' | 'playing' | 'celebrating' | 'disappointed' | 'worried' | 'hatch';

const files = import.meta.glob<{ default: object }>('../../assets/lottie/*.json');

/** Idle states loop; event states play once. */
export const LOOPING_KEYS: ReadonlySet<LottieKey> = new Set<LottieKey>([
  'idle',
  'sad',
  'focused',
  'playing',
  'worried',
]);

export function lottieKeyFor(mood: Mood, state: CreatureState): LottieKey {
  if (state === 'idle') return mood === 'sad' ? 'sad' : 'idle';
  return state;
}

export type LottieLoader = () => Promise<object>;

const cache = new Map<LottieKey, LottieLoader | null>();

export function lottieLoader(key: LottieKey): LottieLoader | null {
  if (!cache.has(key)) {
    const load = files[`../../assets/lottie/${key}.json`];
    cache.set(key, load ? () => load().then((m) => m.default) : null);
  }
  return cache.get(key)!;
}
