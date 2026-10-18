import { DEFAULT_WARDROBE } from '../config';
import type { Accessory, FoxColor, PersistedState } from '../types';
import * as engine from './engine';
import { applyUnlocks, equip, markSeen, setColor, unseenUnlocks, type UnlockId } from './unlocks';

const DAY = 86_400_000;
const T0 = new Date(2026, 0, 1, 9, 0).getTime();

/** One 25 min session per day, so the streak grows with the session count. */
function playSessions(n: number) {
  let s: PersistedState = engine.onboard(engine.initialState(), 'Pip', T0);
  const unlockedAt = new Map<UnlockId, number[]>();
  for (let i = 1; i <= n; i++) {
    const start = T0 + (i - 1) * DAY;
    s = engine.startFocus(s, start, `s${i}`);
    const out = engine.tick(s, start + 25 * 60_000);
    const e = out.events[0];
    if (e?.type !== 'completed') throw new Error('session did not complete');
    for (const uid of e.unlocked) unlockedAt.set(uid, [...(unlockedAt.get(uid) ?? []), i]);
    s = engine.skipBreak(out.state);
  }
  return { state: s, unlockedAt };
}

describe('unlocks', () => {
  it('each unlock triggers exactly once, at its threshold', () => {
    const { state, unlockedAt } = playSessions(55);
    expect(Object.fromEntries(unlockedAt)).toEqual({
      'color:arctic': [5], // 125 XP = Kid
      'accessory:headphones': [7], // 7-day streak
      'accessory:glasses': [10], // 10 sessions
      'color:silver': [15], // 375 XP = Teen
      'accessory:flowerCrown': [24], // 600 min = 10 hours
      'accessory:beanie': [25], // 25 sessions
      'accessory:starCape': [30], // 30-day streak
      'color:midnight': [40], // 1000 XP = Adult
      'accessory:bowTie': [50], // 50 sessions
    });
    expect(state.wardrobe.unlockedColors.sort()).toEqual(['arctic', 'midnight', 'red', 'silver']);
    expect(state.wardrobe.unlockedAccessories).toHaveLength(7);
  });

  it('nothing unlocks one session early', () => {
    const { state } = playSessions(9);
    expect(state.wardrobe.unlockedAccessories).not.toContain('glasses');
    expect(state.wardrobe.unlockedAccessories).toContain('headphones');
  });

  it('abandoned sessions do not count toward session unlocks', () => {
    let s = engine.onboard(engine.initialState(), 'Pip', T0);
    for (let i = 0; i < 12; i++) {
      s = engine.startFocus(s, T0 + i * 60 * 60_000, `a${i}`);
      s = engine.abandonFocus(s, T0 + i * 60 * 60_000 + 60_000, 'gaveUp').state;
    }
    expect(s.wardrobe.unlockedAccessories).toEqual(['none']);
  });

  it('streak unlocks use the best streak, so a later break keeps them', () => {
    const r = applyUnlocks(DEFAULT_WARDROBE, {
      sessions: 0,
      focusMinutes: 0,
      bestStreak: 7,
      xp: 0,
    });
    expect(r.unlocked).toEqual(['accessory:headphones']);
  });

  it('catches up on startup (e.g. after upgrading from V1)', () => {
    const { state } = playSessions(12);
    const reset = { ...state, wardrobe: { ...DEFAULT_WARDROBE } };
    const out = engine.onStartup(reset, T0 + 12 * DAY);
    expect(out.state.wardrobe.unlockedAccessories).toEqual(['none', 'glasses', 'headphones']);
    expect(out.state.wardrobe.unlockedColors).toEqual(['red', 'arctic']);
  });

  it('queues unseen unlocks until marked seen', () => {
    const { state } = playSessions(10);
    expect(unseenUnlocks(state.wardrobe).map((u) => u.uid)).toEqual([
      'accessory:glasses',
      'color:arctic',
      'accessory:headphones',
    ]);
    const w = markSeen(state.wardrobe, 'color:arctic');
    expect(unseenUnlocks(w).map((u) => u.uid)).toEqual([
      'accessory:glasses',
      'accessory:headphones',
    ]);
    expect(markSeen(w, 'color:arctic')).toBe(w);
  });

  it('equips one accessory at a time, and only unlocked ones', () => {
    const w = { ...DEFAULT_WARDROBE, unlockedAccessories: ['none', 'glasses'] as Accessory[] };
    const withGlasses = equip(w, 'glasses');
    expect(withGlasses.equipped).toBe('glasses');
    expect(equip(withGlasses, 'beanie')).toBe(withGlasses); // locked
    expect(equip(withGlasses, 'none').equipped).toBe('none');
  });

  it('switches only to unlocked colors', () => {
    expect(setColor(DEFAULT_WARDROBE, 'midnight')).toBe(DEFAULT_WARDROBE);
    const w = { ...DEFAULT_WARDROBE, unlockedColors: ['red', 'midnight'] as FoxColor[] };
    expect(setColor(w, 'midnight').color).toBe('midnight');
  });
});
