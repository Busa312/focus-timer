/**
 * Catch the treats: pure game logic. The play area is 1 x 1 (x across, y down);
 * Pip walks along the bottom and catches what falls into the catch line.
 */

export type ItemKind = 'berry' | 'golden' | 'pinecone';

export interface FallingItem {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
  /** Fall speed in play-area heights per second. */
  speed: number;
}

export interface CatchEvent {
  id: number;
  kind: ItemKind;
  x: number;
  points: number;
}

export interface CatchState {
  elapsedMs: number;
  score: number;
  foxX: number;
  items: FallingItem[];
  nextSpawnMs: number;
  nextId: number;
  caught: Record<ItemKind, number>;
  /** Catches from the latest step, for "+1" popups and sounds. */
  events: CatchEvent[];
}

export const CATCH = {
  roundMs: 60_000,
  points: { berry: 1, golden: 5, pinecone: -3 } as Record<ItemKind, number>,
  /** Where Pip's paws catch things, as a fraction of the play area's height. */
  catchY: 0.84,
  foxHalfWidth: 0.1,
  itemRadius: 0.035,
  /** Spawn interval and fall speed ease from the first value to the second over the round. */
  spawnMs: [900, 380] as const,
  speed: [0.32, 0.7] as const,
  goldenChance: 0.05,
  pineconeChance: [0.12, 0.24] as const,
  /** Keyboard walking speed, play-area widths per second. */
  keySpeed: 1.1,
  /** Long frames (tab in background, slow phone) are capped so nothing teleports. */
  maxStepMs: 50,
} as const;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function newCatchGame(): CatchState {
  return {
    elapsedMs: 0,
    score: 0,
    foxX: 0.5,
    items: [],
    nextSpawnMs: 400,
    nextId: 1,
    caught: { berry: 0, golden: 0, pinecone: 0 },
    events: [],
  };
}

export const timeLeftMs = (s: CatchState) => Math.max(0, CATCH.roundMs - s.elapsedMs);
export const isOver = (s: CatchState) => s.elapsedMs >= CATCH.roundMs;

/** 0 at the start of the round, 1 at the end. */
const progress = (s: CatchState) => clamp(s.elapsedMs / CATCH.roundMs, 0, 1);

export function moveFoxTo(s: CatchState, x: number): CatchState {
  const foxX = clamp(x, CATCH.foxHalfWidth, 1 - CATCH.foxHalfWidth);
  return foxX === s.foxX ? s : { ...s, foxX };
}

function pickKind(s: CatchState, rand: () => number): ItemKind {
  const r = rand();
  if (r < CATCH.goldenChance) return 'golden';
  const pinecone = lerp(CATCH.pineconeChance[0], CATCH.pineconeChance[1], progress(s));
  return r < CATCH.goldenChance + pinecone ? 'pinecone' : 'berry';
}

/**
 * Advance the game by `dtMs`. `walk` is the keyboard direction (-1, 0, 1).
 * `rand` returns numbers in [0, 1); pass a seeded one for repeatable games.
 */
export function step(s: CatchState, dtMs: number, rand: () => number, walk = 0): CatchState {
  if (isOver(s)) return s.events.length ? { ...s, events: [] } : s;
  const dt = Math.min(Math.max(0, dtMs), CATCH.maxStepMs);
  const elapsedMs = Math.min(CATCH.roundMs, s.elapsedMs + dt);
  let next: CatchState = { ...s, elapsedMs, events: [] };
  if (walk) next = moveFoxTo(next, next.foxX + walk * CATCH.keySpeed * (dt / 1000));

  // Spawn.
  let { nextSpawnMs, nextId } = next;
  const items = [...next.items];
  nextSpawnMs -= dt;
  while (nextSpawnMs <= 0 && !isOver(next)) {
    const t = progress(next);
    items.push({
      id: nextId++,
      kind: pickKind(next, rand),
      x: lerp(CATCH.itemRadius + 0.02, 1 - CATCH.itemRadius - 0.02, rand()),
      y: -CATCH.itemRadius,
      speed: lerp(CATCH.speed[0], CATCH.speed[1], t) * lerp(0.85, 1.15, rand()),
    });
    nextSpawnMs += lerp(CATCH.spawnMs[0], CATCH.spawnMs[1], t);
  }

  // Fall, catch, or drop off the bottom (misses cost nothing).
  let score = next.score;
  const caught = { ...next.caught };
  const events: CatchEvent[] = [];
  const kept: FallingItem[] = [];
  for (const item of items) {
    const y = item.y + item.speed * (dt / 1000);
    // Check the whole path this step, so a fast item can't skip past the catch line.
    const crossed = item.y < CATCH.catchY && y >= CATCH.catchY;
    const inReach = Math.abs(item.x - next.foxX) <= CATCH.foxHalfWidth + CATCH.itemRadius;
    if (crossed && inReach) {
      const points = CATCH.points[item.kind];
      score = Math.max(0, score + points);
      caught[item.kind] += 1;
      events.push({ id: item.id, kind: item.kind, x: item.x, points });
    } else if (y < 1 + CATCH.itemRadius) {
      kept.push({ ...item, y });
    }
  }

  return { ...next, items: kept, nextSpawnMs, nextId, score, caught, events };
}
