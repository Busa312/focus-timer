import type { ActiveSession } from '../types';

/**
 * What to do with a session after the user was away.
 * - resume:   carry on, no penalty
 * - complete: the focus session finished (before or during the grace window)
 * - abandon:  away longer than the grace period before the timer ended
 * - endBreak: a break ran out while away
 * - none:     nothing to decide
 */
export type ReturnDecision = 'resume' | 'complete' | 'abandon' | 'endBreak' | 'none';

/**
 * Decide the outcome once the user is back, using only saved timestamps.
 * `leftAt` is when the user left (hiddenAt, or lastSeenAt after the app was killed).
 *
 * The session is abandoned at `leftAt + grace`. If the timer ended before that
 * moment (including while still visible, or within the grace window), it counts
 * as completed.
 */
export function decideAfterAbsence(
  s: ActiveSession,
  leftAt: number | null,
  now: number,
  graceMs: number,
): ReturnDecision {
  if (s.phase !== 'focus') {
    return now >= s.endsAt && s.pausedAt === null ? 'endBreak' : 'none';
  }
  // Leaving while paused is allowed and has no penalty.
  if (s.pausedAt !== null) return 'none';
  if (leftAt === null) return now >= s.endsAt ? 'complete' : 'none';

  if (s.endsAt <= leftAt + graceMs) {
    // Timer ended before the grace window ran out.
    return now >= s.endsAt ? 'complete' : 'resume';
  }
  const away = now - leftAt;
  return away <= graceMs ? 'resume' : 'abandon';
}

/** Decision when the page becomes visible again. */
export function decideOnVisible(s: ActiveSession, now: number, graceMs: number): ReturnDecision {
  return decideAfterAbsence(s, s.hiddenAt, now, graceMs);
}

/**
 * Decision on app start (reload or relaunch). If the page was hidden when it
 * was killed we know exactly when the user left; otherwise fall back to the
 * last heartbeat.
 */
export function decideOnStartup(s: ActiveSession, now: number, graceMs: number): ReturnDecision {
  const leftAt = s.hiddenAt ?? s.lastSeenAt;
  return decideAfterAbsence(s, leftAt, now, graceMs);
}

/** Milliseconds left in the grace window, for the Worried countdown. */
export function graceRemainingMs(hiddenAt: number, now: number, graceMs: number): number {
  return Math.max(0, hiddenAt + graceMs - now);
}
