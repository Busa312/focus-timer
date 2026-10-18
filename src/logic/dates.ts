/** Local-time calendar helpers. Date keys are 'YYYY-MM-DD' in device local time. */

export function toDateKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  // Noon avoids DST edges when stepping days.
  return new Date(y, m - 1, d, 12);
}

export function addDays(key: string, days: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d.getTime());
}

/** Whole calendar days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86_400_000);
}

/** Epoch ms of local midnight at the start of the given day key. */
export function startOfDay(key: string): number {
  const d = parseKey(key);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
