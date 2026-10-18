import type { SessionRecord } from '../types';
import { addDays, toDateKey } from './dates';

export interface Totals {
  /** Minutes from completed sessions only. */
  focusMinutes: number;
  completed: number;
  abandoned: number;
}

export function totals(history: readonly SessionRecord[]): Totals {
  const t: Totals = { focusMinutes: 0, completed: 0, abandoned: 0 };
  for (const h of history) {
    if (h.result === 'completed') {
      t.completed++;
      t.focusMinutes += h.focusMinutes;
    } else {
      t.abandoned++;
    }
  }
  t.focusMinutes = Math.round(t.focusMinutes);
  return t;
}

/** Completed focus minutes per local day for the last `days` days, oldest first. */
export function dailyFocus(
  history: readonly SessionRecord[],
  today: string,
  days: number,
): { date: string; minutes: number }[] {
  const first = addDays(today, -(days - 1));
  const byDay = new Map<string, number>();
  for (const h of history) {
    if (h.result !== 'completed') continue;
    const d = toDateKey(h.endedAt);
    if (d < first || d > today) continue;
    byDay.set(d, (byDay.get(d) ?? 0) + h.focusMinutes);
  }
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(first, i);
    return { date, minutes: Math.round(byDay.get(date) ?? 0) };
  });
}

/** "3h 20m", "45m", "0m". */
export function formatDuration(minutes: number): string {
  const m = Math.round(minutes);
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}m`;
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`;
}
