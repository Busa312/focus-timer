import type { Streak } from '../types';
import { addDays } from './dates';

export const EMPTY_STREAK: Streak = { current: 0, best: 0, lastCompletedDate: null };

/** Count a completed focus session on `today` (local 'YYYY-MM-DD'). */
export function recordCompletion(streak: Streak, today: string): Streak {
  if (streak.lastCompletedDate === today) return streak;
  const continues = streak.lastCompletedDate === addDays(today, -1);
  const current = continues ? streak.current + 1 : 1;
  return { current, best: Math.max(streak.best, current), lastCompletedDate: today };
}

/** Reset the current streak to 0 when a whole day was missed. */
export function refreshStreak(streak: Streak, today: string): Streak {
  const last = streak.lastCompletedDate;
  const alive = last === today || last === addDays(today, -1);
  if (alive || streak.current === 0) return streak;
  return { ...streak, current: 0 };
}
