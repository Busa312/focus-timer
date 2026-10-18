import { PRESETS, type TimerLengths } from '../config';
import type { ActivePhase, ActiveSession, Settings } from '../types';

/** Lengths in effect: the selected preset's, or the saved custom ones. */
export function timerLengths(settings: Settings): TimerLengths {
  if (settings.presetId === 'custom') {
    const { focusMin, shortBreakMin, longBreakMin } = settings;
    return { focusMin, shortBreakMin, longBreakMin };
  }
  return PRESETS[settings.presetId];
}

export function phaseDurationMs(phase: ActivePhase, settings: Settings): number {
  const t = timerLengths(settings);
  const minutes =
    phase === 'focus' ? t.focusMin : phase === 'shortBreak' ? t.shortBreakMin : t.longBreakMin;
  return Math.round(minutes * 60_000);
}

export function createSession(
  phase: ActivePhase,
  now: number,
  durationMs: number,
  id: string,
): ActiveSession {
  return {
    id,
    phase,
    startedAt: now,
    endsAt: now + durationMs,
    pausedAt: null,
    pausedTotalMs: 0,
    hiddenAt: null,
    lastSeenAt: now,
  };
}

/** Planned length of the session, excluding pauses. */
export function sessionDurationMs(s: ActiveSession): number {
  return s.endsAt - s.startedAt - s.pausedTotalMs;
}

export function remainingMs(s: ActiveSession, now: number): number {
  const ref = s.pausedAt ?? now;
  return Math.max(0, s.endsAt - ref);
}

/** Fraction of the session elapsed, 0..1. */
export function elapsedFraction(s: ActiveSession, now: number): number {
  const total = sessionDurationMs(s);
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - remainingMs(s, now) / total));
}

export function isTimeUp(s: ActiveSession, now: number): boolean {
  return s.pausedAt === null && now >= s.endsAt;
}

export function pauseSession(s: ActiveSession, now: number): ActiveSession {
  if (s.pausedAt !== null || now >= s.endsAt) return s;
  return { ...s, pausedAt: now };
}

export function resumeSession(s: ActiveSession, now: number): ActiveSession {
  if (s.pausedAt === null) return s;
  const pausedFor = Math.max(0, now - s.pausedAt);
  return {
    ...s,
    endsAt: s.endsAt + pausedFor,
    pausedTotalMs: s.pausedTotalMs + pausedFor,
    pausedAt: null,
    hiddenAt: null,
    lastSeenAt: now,
  };
}

/**
 * After a completed focus session: which break comes next and the new cycle count.
 * `cycleCount` is the count *before* this session.
 */
export function breakAfterFocus(
  cycleCount: number,
  sessionsPerLongBreak: number,
): { phase: 'shortBreak' | 'longBreak'; cycleCount: number; longBreakEarned: boolean } {
  const next = cycleCount + 1;
  if (next >= sessionsPerLongBreak) {
    return { phase: 'longBreak', cycleCount: 0, longBreakEarned: true };
  }
  return { phase: 'shortBreak', cycleCount: next, longBreakEarned: false };
}

/** Focus minutes for XP and history (rounded to 2 decimals for fast mode). */
export function focusMinutesOf(s: ActiveSession): number {
  return Math.round((sessionDurationMs(s) / 60_000) * 100) / 100;
}

/** 'MM:SS' for the countdown, or 'H:MM:SS' past an hour. */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
