import { seededRandom } from './random';
import {
  CATCH,
  isOver,
  moveFoxTo,
  newCatchGame,
  step,
  timeLeftMs,
  type CatchState,
  type FallingItem,
} from './catchGame';

const noSpawn = () => 0.5;

/** A game with one item placed right above the catch line, and no new spawns for a while. */
function withItem(item: Partial<FallingItem>, foxX = 0.5): CatchState {
  return {
    ...newCatchGame(),
    foxX,
    nextSpawnMs: 10_000,
    items: [{ id: 99, kind: 'berry', x: 0.5, y: CATCH.catchY - 0.01, speed: 0.5, ...item }],
  };
}

/** Run a whole round in 16 ms frames. */
function play(seed: number, foxAt?: (s: CatchState) => number) {
  const rand = seededRandom(seed);
  let s = newCatchGame();
  let frames = 0;
  while (!isOver(s)) {
    if (foxAt) s = moveFoxTo(s, foxAt(s));
    s = step(s, 16, rand);
    frames++;
  }
  return { s, frames };
}

describe('Catch the treats: round', () => {
  it('lasts 60 seconds', () => {
    const s = step(newCatchGame(), 16, noSpawn);
    expect(timeLeftMs(s)).toBe(60_000 - 16);
    const { s: end, frames } = play(1);
    expect(isOver(end)).toBe(true);
    expect(timeLeftMs(end)).toBe(0);
    expect(frames).toBe(Math.ceil(60_000 / 16));
  });

  it('caps long frames so a background tab does not eat the round', () => {
    const s = step(newCatchGame(), 5_000, noSpawn);
    expect(s.elapsedMs).toBe(CATCH.maxStepMs);
  });

  it('does nothing once the round is over', () => {
    const { s } = play(2);
    expect(step(s, 16, noSpawn)).toBe(s);
  });

  it('is repeatable with the same seed', () => {
    expect(play(7).s.score).toBe(play(7).s.score);
    expect(play(7).s.nextId).toBe(play(7).s.nextId);
  });
});

describe('Catch the treats: spawning and speed', () => {
  it('spawns faster and falls faster as the round goes on', () => {
    const rand = seededRandom(3);
    let s = newCatchGame();
    const early: FallingItem[] = [];
    const late: FallingItem[] = [];
    let lastId = 0;
    while (!isOver(s)) {
      s = step(s, 16, rand);
      for (const i of s.items) {
        if (i.id <= lastId) continue;
        lastId = i.id;
        (s.elapsedMs < 15_000 ? early : s.elapsedMs > 45_000 ? late : []).push(i);
      }
    }
    expect(late.length).toBeGreaterThan(early.length * 1.5);
    const avg = (xs: FallingItem[]) => xs.reduce((a, i) => a + i.speed, 0) / xs.length;
    expect(avg(late)).toBeGreaterThan(avg(early) * 1.5);
  });

  it('drops berries, rare golden berries and some pinecones', () => {
    const rand = seededRandom(11);
    const kinds = { berry: 0, golden: 0, pinecone: 0 };
    for (let round = 0; round < 5; round++) {
      let s = newCatchGame();
      const seen = new Set<number>();
      while (!isOver(s)) {
        s = step(s, 16, rand);
        for (const i of s.items) {
          if (seen.has(i.id)) continue;
          seen.add(i.id);
          kinds[i.kind]++;
        }
      }
    }
    const total = kinds.berry + kinds.golden + kinds.pinecone;
    expect(kinds.golden / total).toBeGreaterThan(0.02);
    expect(kinds.golden / total).toBeLessThan(0.1);
    expect(kinds.pinecone / total).toBeGreaterThan(0.1);
    expect(kinds.berry).toBeGreaterThan(kinds.pinecone);
  });
});

describe('Catch the treats: catching', () => {
  it.each([
    ['berry', 1],
    ['golden', 5],
  ] as const)('a caught %s is worth %i', (kind, points) => {
    const s = step(withItem({ kind }), 40, noSpawn);
    expect(s.score).toBe(points);
    expect(s.caught[kind]).toBe(1);
    expect(s.items).toEqual([]);
    expect(s.events).toEqual([{ id: 99, kind, x: 0.5, points }]);
  });

  it('a pinecone costs 3, but the score never goes below 0', () => {
    let s = { ...withItem({ kind: 'pinecone' }), score: 10 };
    expect(step(s, 40, noSpawn).score).toBe(7);
    s = { ...withItem({ kind: 'pinecone' }), score: 1 };
    expect(step(s, 40, noSpawn).score).toBe(0);
  });

  it('misses cost nothing and fall off the bottom', () => {
    let s = withItem({ x: 0.1 }, 0.9);
    for (let i = 0; i < 30; i++) s = step(s, 50, noSpawn);
    expect(s.score).toBe(0);
    expect(s.items).toEqual([]);
  });

  it('catches at the edge of Pip’s reach, not beyond', () => {
    const reach = CATCH.foxHalfWidth + CATCH.itemRadius;
    expect(step(withItem({ x: 0.5 + reach - 0.001 }), 40, noSpawn).score).toBe(1);
    expect(step(withItem({ x: 0.5 + reach + 0.01 }), 40, noSpawn).score).toBe(0);
  });

  it('a fast item cannot skip past the catch line in one long frame', () => {
    const s = step(withItem({ y: CATCH.catchY - 0.2, speed: 6 }), 50, noSpawn);
    expect(s.score).toBe(1);
  });

  it('an item only counts once', () => {
    let s = withItem({});
    s = step(s, 40, noSpawn);
    s = step(s, 40, noSpawn);
    expect(s.score).toBe(1);
  });

  it('a player who follows the berries scores well; one who stands still scores little', () => {
    const chase = play(5, (s) => {
      const target = s.items
        .filter((i) => i.kind !== 'pinecone' && i.y < CATCH.catchY)
        .sort((a, b) => b.y - a.y)[0];
      return target ? target.x : s.foxX;
    }).s.score;
    const still = play(5).s.score;
    expect(chase).toBeGreaterThan(40);
    expect(chase).toBeGreaterThan(still * 3);
  });
});

describe('Catch the treats: moving Pip', () => {
  it('keeps Pip inside the play area', () => {
    expect(moveFoxTo(newCatchGame(), -1).foxX).toBe(CATCH.foxHalfWidth);
    expect(moveFoxTo(newCatchGame(), 2).foxX).toBe(1 - CATCH.foxHalfWidth);
    expect(moveFoxTo(newCatchGame(), 0.3).foxX).toBe(0.3);
  });

  it('walks with the keyboard', () => {
    const s = step(newCatchGame(), 50, noSpawn, 1);
    expect(s.foxX).toBeCloseTo(0.5 + CATCH.keySpeed * 0.05);
    expect(step(s, 50, noSpawn, -1).foxX).toBeCloseTo(0.5);
  });
});
