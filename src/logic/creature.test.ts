import { HAPPINESS } from '../config';
import type { Creature } from '../types';
import {
  applyAbandon,
  applyCompletion,
  applyDailyDecay,
  clampHappiness,
  createCreature,
  levelForXp,
  moodForHappiness,
  nextStageInfo,
  stageForXp,
  stageProgress,
  xpForSession,
} from './creature';

const NOW = new Date(2026, 9, 19, 10, 0).getTime();

function fox(overrides: Partial<Creature> = {}): Creature {
  return { ...createCreature('Pip', '2026-10-19'), ...overrides };
}

describe('createCreature', () => {
  it('starts at 0 XP, 70 happiness, unhatched', () => {
    const c = createCreature('  Pip ', '2026-10-19');
    expect(c).toEqual({
      name: 'Pip',
      xp: 0,
      happiness: 70,
      hatchedAt: null,
      lastDecayCheck: '2026-10-19',
      pendingComeback: false,
    });
  });
});

describe('stageForXp', () => {
  it.each([
    [0, 'egg'],
    [3, 'egg'],
    [4, 'baby'],
    [25, 'baby'],
    [124, 'baby'],
    [125, 'kid'],
    [374, 'kid'],
    [375, 'teen'],
    [999, 'teen'],
    [1000, 'adult'],
    [50_000, 'adult'],
  ])('%i XP is %s', (xp, stage) => {
    expect(stageForXp(xp)).toBe(stage);
  });
});

describe('nextStageInfo / stageProgress / levelForXp', () => {
  it('reports XP to the next stage', () => {
    expect(nextStageInfo(0)).toEqual({ stage: 'baby', xpNeeded: 4, at: 4 });
    expect(nextStageInfo(100)).toEqual({ stage: 'kid', xpNeeded: 25, at: 125 });
    expect(nextStageInfo(1000)).toBeNull();
  });

  it('reports progress through the current stage', () => {
    expect(stageProgress(0)).toBe(0);
    expect(stageProgress(250)).toBe(0.5); // 125..375
    expect(stageProgress(2000)).toBe(1);
  });

  it('levels are floor(XP / 250)', () => {
    expect(levelForXp(0)).toBe(0);
    expect(levelForXp(249)).toBe(0);
    expect(levelForXp(1000)).toBe(4);
    expect(levelForXp(1260)).toBe(5);
  });
});

describe('moodForHappiness', () => {
  it.each([
    [100, 'ecstatic'],
    [80, 'ecstatic'],
    [79, 'happy'],
    [50, 'happy'],
    [49, 'meh'],
    [25, 'meh'],
    [24, 'sad'],
    [0, 'sad'],
  ])('%i is %s', (h, mood) => {
    expect(moodForHappiness(h)).toBe(mood);
  });
});

describe('clampHappiness', () => {
  it('keeps happiness within 0..100', () => {
    expect(clampHappiness(-20)).toBe(0);
    expect(clampHappiness(130)).toBe(100);
    expect(clampHappiness(55)).toBe(55);
  });
});

describe('applyCompletion', () => {
  it('adds XP equal to focus minutes and +10 happiness', () => {
    const r = applyCompletion(fox({ xp: 30 }), {
      focusMinutes: 25,
      longBreakEarned: false,
      now: NOW,
    });
    expect(r.creature.xp).toBe(55);
    expect(r.creature.happiness).toBe(80);
    expect(r.xpGained).toBe(25);
    expect(r.happinessGained).toBe(10);
  });

  it('hatches the egg after the first completed 25 min session', () => {
    const r = applyCompletion(fox(), { focusMinutes: 25, longBreakEarned: false, now: NOW });
    expect(r.hatched).toBe(true);
    expect(r.stagedUp).toBe(true);
    expect(r.fromStage).toBe('egg');
    expect(r.toStage).toBe('baby');
    expect(r.creature.hatchedAt).toBe(NOW);
  });

  it('keeps the original hatch time', () => {
    const r = applyCompletion(fox({ xp: 25, hatchedAt: 1 }), {
      focusMinutes: 25,
      longBreakEarned: false,
      now: NOW,
    });
    expect(r.hatched).toBe(false);
    expect(r.creature.hatchedAt).toBe(1);
  });

  it.each([
    [0, 4, 'baby'],
    [3, 1, 'baby'],
    [0, 25, 'baby'],
    [100, 25, 'kid'],
    [350, 25, 'teen'],
    [975, 25, 'adult'],
  ])('stages up exactly at the threshold (%i + %i -> %s)', (xp, mins, to) => {
    const r = applyCompletion(fox({ xp }), {
      focusMinutes: mins,
      longBreakEarned: false,
      now: NOW,
    });
    expect(r.stagedUp).toBe(true);
    expect(r.toStage).toBe(to);
  });

  it('does not stage up below a threshold', () => {
    const r = applyCompletion(fox({ xp: 99 }), {
      focusMinutes: 25,
      longBreakEarned: false,
      now: NOW,
    });
    expect(r.creature.xp).toBe(124);
    expect(r.stagedUp).toBe(false);
  });

  it('adds +5 extra when a long break is earned', () => {
    const r = applyCompletion(fox({ happiness: 50 }), {
      focusMinutes: 25,
      longBreakEarned: true,
      now: NOW,
    });
    expect(r.creature.happiness).toBe(65);
  });

  it('adds a +5 comeback bonus after an abandon, once', () => {
    const r = applyCompletion(fox({ happiness: 40, pendingComeback: true }), {
      focusMinutes: 25,
      longBreakEarned: false,
      now: NOW,
    });
    expect(r.creature.happiness).toBe(55);
    expect(r.creature.pendingComeback).toBe(false);

    const again = applyCompletion(r.creature, {
      focusMinutes: 25,
      longBreakEarned: false,
      now: NOW,
    });
    expect(again.creature.happiness).toBe(65);
  });

  it('stacks long-break and comeback bonuses', () => {
    const r = applyCompletion(fox({ happiness: 10, pendingComeback: true }), {
      focusMinutes: 25,
      longBreakEarned: true,
      now: NOW,
    });
    expect(r.creature.happiness).toBe(30);
  });

  it('clamps happiness at 100 and reports the real gain', () => {
    const r = applyCompletion(fox({ happiness: 95 }), {
      focusMinutes: 25,
      longBreakEarned: true,
      now: NOW,
    });
    expect(r.creature.happiness).toBe(100);
    expect(r.happinessGained).toBe(5);
  });

  it('longer sessions give more XP', () => {
    expect(xpForSession(50)).toBe(50);
    expect(xpForSession(90)).toBe(90);
    expect(xpForSession(1)).toBe(1);
  });
});

describe('applyAbandon', () => {
  it('applies -15 happiness, 0 XP, and sets the comeback flag', () => {
    const c = applyAbandon(fox({ xp: 200, happiness: 70 }));
    expect(c.happiness).toBe(55);
    expect(c.xp).toBe(200);
    expect(c.pendingComeback).toBe(true);
  });

  it('never goes below 0', () => {
    expect(applyAbandon(fox({ happiness: 10 })).happiness).toBe(0);
    expect(applyAbandon(fox({ happiness: 0 })).happiness).toBe(0);
  });
});

describe('applyDailyDecay', () => {
  it('does nothing on the same day', () => {
    const c = fox({ lastDecayCheck: '2026-10-19' });
    expect(applyDailyDecay(c, '2026-10-19', null)).toEqual({ creature: c, missedDays: 0 });
  });

  it('does nothing when yesterday had a completed session', () => {
    const r = applyDailyDecay(fox({ lastDecayCheck: '2026-10-18' }), '2026-10-19', '2026-10-18');
    expect(r.missedDays).toBe(0);
    expect(r.creature.happiness).toBe(70);
    expect(r.creature.lastDecayCheck).toBe('2026-10-19');
  });

  it('applies -5 for one full missed day', () => {
    const r = applyDailyDecay(fox({ lastDecayCheck: '2026-10-18' }), '2026-10-19', '2026-10-17');
    expect(r.missedDays).toBe(1);
    expect(r.creature.happiness).toBe(70 + HAPPINESS.dailyDecay);
  });

  it('applies -5 per missed day across several days', () => {
    // Last session on the 15th, app last opened on the 15th, reopened on the 19th:
    // 16, 17, 18 were missed.
    const r = applyDailyDecay(fox({ lastDecayCheck: '2026-10-15' }), '2026-10-19', '2026-10-15');
    expect(r.missedDays).toBe(3);
    expect(r.creature.happiness).toBe(55);
  });

  it('counts the check day itself when it had no session', () => {
    const r = applyDailyDecay(fox({ lastDecayCheck: '2026-10-17' }), '2026-10-19', null);
    expect(r.missedDays).toBe(2);
  });

  it('is not applied twice for the same days', () => {
    const first = applyDailyDecay(fox({ lastDecayCheck: '2026-10-16' }), '2026-10-19', null);
    const second = applyDailyDecay(first.creature, '2026-10-19', null);
    expect(second.missedDays).toBe(0);
    expect(second.creature.happiness).toBe(first.creature.happiness);
  });

  it('clamps at 0 after a long absence', () => {
    const r = applyDailyDecay(fox({ lastDecayCheck: '2026-01-01' }), '2026-10-19', null);
    expect(r.creature.happiness).toBe(0);
  });

  it('works across a month boundary', () => {
    const r = applyDailyDecay(fox({ lastDecayCheck: '2026-10-30' }), '2026-11-02', '2026-10-30');
    expect(r.missedDays).toBe(2); // Oct 31, Nov 1
  });
});
