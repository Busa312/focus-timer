import { STAGE_THRESHOLDS, UNLOCKS, type UnlockItem, type UnlockRule } from '../config';
import type { Accessory, FoxColor, PersistedState, Wardrobe } from '../types';
import { stageForXp, stageIndex } from './creature';

/** Unique id of an unlock, e.g. 'accessory:glasses' or 'color:arctic'. */
export type UnlockId = `${UnlockItem['kind']}:${UnlockItem['id']}`;

export const unlockId = (item: UnlockItem): UnlockId => `${item.kind}:${item.id}` as UnlockId;

export interface UnlockProgress {
  sessions: number;
  focusMinutes: number;
  bestStreak: number;
  xp: number;
}

export function progressOf(state: PersistedState): UnlockProgress {
  let sessions = 0;
  let focusMinutes = 0;
  for (const h of state.history) {
    if (h.result !== 'completed') continue;
    sessions++;
    focusMinutes += h.focusMinutes;
  }
  return {
    sessions,
    focusMinutes,
    bestStreak: Math.max(state.streak.best, state.streak.current),
    xp: state.creature?.xp ?? 0,
  };
}

/** How far along a rule is: current / target, in the rule's own units. */
export function ruleProgress(
  rule: UnlockRule,
  p: UnlockProgress,
): { current: number; target: number } {
  switch (rule.type) {
    case 'sessions':
      return { current: p.sessions, target: rule.count };
    case 'streak':
      return { current: p.bestStreak, target: rule.days };
    case 'focusHours':
      return { current: Math.floor(p.focusMinutes / 60), target: rule.hours };
    case 'stage': {
      const need = STAGE_THRESHOLDS[stageIndex(rule.stage)].xp;
      return { current: Math.min(p.xp, need), target: need };
    }
  }
}

export function isEarned(rule: UnlockRule, p: UnlockProgress): boolean {
  if (rule.type === 'stage') return stageIndex(stageForXp(p.xp)) >= stageIndex(rule.stage);
  if (rule.type === 'focusHours') return p.focusMinutes >= rule.hours * 60;
  const { current, target } = ruleProgress(rule, p);
  return current >= target;
}

export function ruleText(rule: UnlockRule): string {
  switch (rule.type) {
    case 'sessions':
      return `${rule.count} completed sessions`;
    case 'streak':
      return `${rule.days}-day streak`;
    case 'focusHours':
      return `${rule.hours} hours total focus`;
    case 'stage':
      return `Reach ${rule.stage[0].toUpperCase()}${rule.stage.slice(1)} stage`;
  }
}

export function isUnlocked(w: Wardrobe, item: UnlockItem): boolean {
  return item.kind === 'color'
    ? w.unlockedColors.includes(item.id)
    : w.unlockedAccessories.includes(item.id);
}

/** Add every newly earned item to the wardrobe. Unlocks are never taken away. */
export function applyUnlocks(
  w: Wardrobe,
  p: UnlockProgress,
): { wardrobe: Wardrobe; unlocked: UnlockId[] } {
  const fresh = UNLOCKS.filter((u) => isEarned(u.rule, p) && !isUnlocked(w, u));
  if (fresh.length === 0) return { wardrobe: w, unlocked: [] };
  return {
    wardrobe: {
      ...w,
      unlockedColors: [
        ...w.unlockedColors,
        ...fresh.flatMap((u) => (u.kind === 'color' ? [u.id] : [])),
      ],
      unlockedAccessories: [
        ...w.unlockedAccessories,
        ...fresh.flatMap((u) => (u.kind === 'accessory' ? [u.id] : [])),
      ],
    },
    unlocked: fresh.map(unlockId),
  };
}

/** Unlocked items not celebrated yet, in unlock-table order. */
export function unseenUnlocks(w: Wardrobe): (UnlockItem & { uid: UnlockId })[] {
  return UNLOCKS.filter((u) => isUnlocked(w, u) && !w.seenUnlocks.includes(unlockId(u))).map(
    (u) => ({ kind: u.kind, id: u.id, uid: unlockId(u) }) as UnlockItem & { uid: UnlockId },
  );
}

/** Evaluate unlocks against the current state. */
export function withUnlocks(state: PersistedState): {
  state: PersistedState;
  unlocked: UnlockId[];
} {
  const { wardrobe, unlocked } = applyUnlocks(state.wardrobe, progressOf(state));
  return { state: unlocked.length ? { ...state, wardrobe } : state, unlocked };
}

/** Equip an unlocked accessory (one at a time). Locked items are ignored. */
export function equip(w: Wardrobe, accessory: Accessory): Wardrobe {
  return w.unlockedAccessories.includes(accessory) ? { ...w, equipped: accessory } : w;
}

export function setColor(w: Wardrobe, color: FoxColor): Wardrobe {
  return w.unlockedColors.includes(color) ? { ...w, color } : w;
}

export function markSeen(w: Wardrobe, uid: UnlockId): Wardrobe {
  return w.seenUnlocks.includes(uid) ? w : { ...w, seenUnlocks: [...w.seenUnlocks, uid] };
}
