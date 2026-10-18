import { HAPPINESS, MOOD_THRESHOLDS, STAGE_THRESHOLDS, XP_PER_LEVEL } from '../config';
import type { Creature, Mood, Stage } from '../types';
import { addDays, daysBetween } from './dates';

export function createCreature(name: string, today: string): Creature {
  return {
    name: name.trim(),
    xp: 0,
    happiness: HAPPINESS.start,
    hatchedAt: null,
    lastDecayCheck: today,
    pendingComeback: false,
  };
}

export function clampHappiness(value: number): number {
  return Math.min(HAPPINESS.max, Math.max(HAPPINESS.min, value));
}

export function stageForXp(xp: number): Stage {
  let stage: Stage = 'egg';
  for (const t of STAGE_THRESHOLDS) {
    if (xp >= t.xp) stage = t.stage;
  }
  return stage;
}

export function stageIndex(stage: Stage): number {
  return STAGE_THRESHOLDS.findIndex((t) => t.stage === stage);
}

/** The next stage and how much XP is still needed, or null once Adult. */
export function nextStageInfo(xp: number): { stage: Stage; xpNeeded: number; at: number } | null {
  const next = STAGE_THRESHOLDS.find((t) => t.xp > xp);
  return next ? { stage: next.stage, xpNeeded: next.xp - xp, at: next.xp } : null;
}

/** Progress 0..1 through the current stage (1 once Adult). */
export function stageProgress(xp: number): number {
  const current = STAGE_THRESHOLDS[stageIndex(stageForXp(xp))];
  const next = nextStageInfo(xp);
  if (!next) return 1;
  return (xp - current.xp) / (next.at - current.xp);
}

/** Level number for bragging rights after Adult. */
export function levelForXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL);
}

export function moodForHappiness(happiness: number): Mood {
  if (happiness >= MOOD_THRESHOLDS.ecstatic) return 'ecstatic';
  if (happiness >= MOOD_THRESHOLDS.happy) return 'happy';
  if (happiness >= MOOD_THRESHOLDS.meh) return 'meh';
  return 'sad';
}

/** XP earned for a completed focus session (equal to its focus minutes). */
export function xpForSession(focusMinutes: number): number {
  return Math.max(0, Math.round(focusMinutes));
}

export interface CompletionResult {
  creature: Creature;
  xpGained: number;
  happinessGained: number;
  stagedUp: boolean;
  hatched: boolean;
  fromStage: Stage;
  toStage: Stage;
}

export function applyCompletion(
  creature: Creature,
  opts: { focusMinutes: number; longBreakEarned: boolean; now: number },
): CompletionResult {
  const xpGained = xpForSession(opts.focusMinutes);
  let delta = HAPPINESS.completed;
  if (opts.longBreakEarned) delta += HAPPINESS.longBreakBonus;
  if (creature.pendingComeback) delta += HAPPINESS.comebackBonus;

  const xp = creature.xp + xpGained;
  const happiness = clampHappiness(creature.happiness + delta);
  const fromStage = stageForXp(creature.xp);
  const toStage = stageForXp(xp);
  const hatched = fromStage === 'egg' && toStage !== 'egg';

  return {
    creature: {
      ...creature,
      xp,
      happiness,
      pendingComeback: false,
      hatchedAt: creature.hatchedAt ?? (hatched ? opts.now : null),
    },
    xpGained,
    happinessGained: happiness - creature.happiness,
    stagedUp: toStage !== fromStage,
    hatched,
    fromStage,
    toStage,
  };
}

/** Abandoned session: happiness drops, XP is never lost. */
export function applyAbandon(creature: Creature): Creature {
  return {
    ...creature,
    happiness: clampHappiness(creature.happiness + HAPPINESS.abandoned),
    pendingComeback: true,
  };
}

/**
 * Apply -5 happiness for each full calendar day with no completed session,
 * counted from the last check up to (not including) today.
 */
export function applyDailyDecay(
  creature: Creature,
  today: string,
  lastCompletedDate: string | null,
): { creature: Creature; missedDays: number } {
  const span = daysBetween(creature.lastDecayCheck, today);
  if (span <= 0) {
    return { creature, missedDays: 0 };
  }
  let missedDays = 0;
  for (let i = 0; i < span; i++) {
    const day = addDays(creature.lastDecayCheck, i);
    if (lastCompletedDate === null || day > lastCompletedDate) missedDays++;
  }
  return {
    creature: {
      ...creature,
      happiness: clampHappiness(creature.happiness + HAPPINESS.dailyDecay * missedDays),
      lastDecayCheck: today,
    },
    missedDays,
  };
}
