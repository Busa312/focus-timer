import type { Label, SessionRecord, Streak } from '../types';
import { addDays, toDateKey } from './dates';

export interface LabelTotal {
  /** null = sessions without a label. */
  labelId: string | null;
  name: string;
  color: string | null;
  archived: boolean;
  minutes: number;
  sessions: number;
}

/** Completed records that ended within the last `days` local days, including today. */
export function completedInLastDays(
  history: readonly SessionRecord[],
  today: string,
  days: number,
): SessionRecord[] {
  const first = addDays(today, -(days - 1));
  return history.filter((h) => {
    if (h.result !== 'completed') return false;
    const d = toDateKey(h.endedAt);
    return d >= first && d <= today;
  });
}

/**
 * Focus minutes per label for the last `days` days, largest first. Archived
 * labels keep their history; a label id with no matching label (deleted data)
 * is counted as "No label".
 */
export function focusByLabel(
  history: readonly SessionRecord[],
  labels: readonly Label[],
  today: string,
  days: number,
): LabelTotal[] {
  const byId = new Map(labels.map((l) => [l.id, l]));
  const totals = new Map<string | null, LabelTotal>();
  for (const h of completedInLastDays(history, today, days)) {
    const label = h.labelId ? byId.get(h.labelId) : undefined;
    const key = label?.id ?? null;
    const t =
      totals.get(key) ??
      ({
        labelId: key,
        name: label?.name ?? 'No label',
        color: label?.color ?? null,
        archived: label?.archived ?? false,
        minutes: 0,
        sessions: 0,
      } satisfies LabelTotal);
    t.minutes += h.focusMinutes;
    t.sessions += 1;
    totals.set(key, t);
  }
  return [...totals.values()]
    .map((t) => ({ ...t, minutes: Math.round(t.minutes) }))
    .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));
}

export interface WeekSummary {
  focusMinutes: number;
  sessions: number;
  streak: number;
  /** Top label by minutes, ignoring unlabeled time; null if nothing was labeled. */
  topLabel: { name: string; color: string; minutes: number } | null;
}

/** Totals for the share card: the last 7 days including today. */
export function weekSummary(
  history: readonly SessionRecord[],
  labels: readonly Label[],
  streak: Streak,
  today: string,
): WeekSummary {
  const week = completedInLastDays(history, today, 7);
  const top = focusByLabel(history, labels, today, 7).find((t) => t.labelId !== null);
  return {
    focusMinutes: Math.round(week.reduce((sum, h) => sum + h.focusMinutes, 0)),
    sessions: week.length,
    streak: streak.current,
    topLabel: top ? { name: top.name, color: top.color!, minutes: top.minutes } : null,
  };
}
