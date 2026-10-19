/**
 * Session state machine over the persisted game state. Pure functions only:
 * every transition takes the state and `now` and returns the next state plus
 * events for the UI (celebration, disappointment, relief, chime).
 */
import {
  DEFAULT_GAME_RECORDS,
  DEFAULT_SETTINGS,
  DEFAULT_WARDROBE,
  HISTORY_LIMIT,
  PERSIST_VERSION,
} from '../config';
import type { AbandonReason, PersistedState, SessionRecord, Stage } from '../types';
import { applyAbandon, applyCompletion, applyDailyDecay, createCreature } from './creature';
import { toDateKey } from './dates';
import { labelForNextSession } from './labels';
import { withUnlocks, type UnlockId } from './unlocks';
import { decideOnStartup, decideOnVisible, type ReturnDecision } from './leave';
import { EMPTY_STREAK, recordCompletion, refreshStreak } from './streak';
import {
  breakAfterFocus,
  createSession,
  focusMinutesOf,
  isTimeUp,
  pauseSession,
  phaseDurationMs,
  remainingMs,
  resumeSession,
  sessionDurationMs,
} from './timer';

export type GameEvent =
  | {
      type: 'completed';
      at: number;
      xpGained: number;
      happinessGained: number;
      stagedUp: boolean;
      hatched: boolean;
      fromStage: Stage;
      toStage: Stage;
      nextBreak: 'shortBreak' | 'longBreak';
      longBreakEarned: boolean;
      /** Wardrobe items earned by this session. */
      unlocked: UnlockId[];
    }
  | { type: 'abandoned'; at: number; reason: AbandonReason }
  | { type: 'relief'; at: number }
  | { type: 'breakEnded'; at: number };

export interface Outcome {
  state: PersistedState;
  events: GameEvent[];
}

const same = (state: PersistedState): Outcome => ({ state, events: [] });

export function initialState(): PersistedState {
  return {
    version: PERSIST_VERSION,
    creature: null,
    active: null,
    cycleCount: 0,
    pendingBreak: null,
    history: [],
    streak: EMPTY_STREAK,
    settings: { ...DEFAULT_SETTINGS },
    labels: [],
    wardrobe: { ...DEFAULT_WARDROBE },
    games: structuredClone(DEFAULT_GAME_RECORDS),
  };
}

export function graceMs(state: PersistedState): number {
  return state.settings.graceSeconds * 1000;
}

function pushHistory(history: SessionRecord[], record: SessionRecord): SessionRecord[] {
  const next = [...history, record];
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next;
}

export function onboard(state: PersistedState, name: string, now: number): PersistedState {
  if (state.creature) return state;
  return { ...state, creature: createCreature(name, toDateKey(now)) };
}

/** Happiness decay for missed days and streak reset. Safe to run any time. */
export function dailyChecks(state: PersistedState, now: number): PersistedState {
  if (!state.creature) return state;
  const today = toDateKey(now);
  const { creature } = applyDailyDecay(state.creature, today, state.streak.lastCompletedDate);
  const streak = refreshStreak(state.streak, today);
  if (creature === state.creature && streak === state.streak) return state;
  return { ...state, creature, streak };
}

export function startFocus(state: PersistedState, now: number, id: string): PersistedState {
  if (!state.creature || state.active) return state;
  const session = createSession('focus', now, phaseDurationMs('focus', state.settings), id);
  const labelId = labelForNextSession(state);
  return {
    ...state,
    active: labelId ? { ...session, labelId } : session,
    pendingBreak: null,
  };
}

export function startBreak(state: PersistedState, now: number, id: string): PersistedState {
  if (!state.pendingBreak || state.active) return state;
  const phase = state.pendingBreak;
  const session = createSession(phase, now, phaseDurationMs(phase, state.settings), id);
  return { ...state, active: session, pendingBreak: null };
}

export function pause(state: PersistedState, now: number): PersistedState {
  if (!state.active) return state;
  const active = pauseSession(state.active, now);
  return active === state.active ? state : { ...state, active };
}

export function resume(state: PersistedState, now: number): PersistedState {
  if (!state.active) return state;
  const active = resumeSession(state.active, now);
  return active === state.active ? state : { ...state, active };
}

export function completeFocus(state: PersistedState, now: number): Outcome {
  const s = state.active;
  if (!s || s.phase !== 'focus' || !state.creature) return same(state);

  const endedAt = Math.min(now, s.endsAt);
  // Count missed days before today's session is recorded.
  const checked = dailyChecks(state, endedAt);
  const creature = checked.creature!;
  const focusMinutes = focusMinutesOf(s);
  const next = breakAfterFocus(checked.cycleCount, checked.settings.sessionsPerLongBreak);
  const result = applyCompletion(creature, {
    focusMinutes,
    longBreakEarned: next.longBreakEarned,
    now: endedAt,
  });

  const completed = withUnlocks({
    ...checked,
    creature: result.creature,
    active: null,
    cycleCount: next.cycleCount,
    pendingBreak: next.phase,
    streak: recordCompletion(checked.streak, toDateKey(endedAt)),
    history: pushHistory(checked.history, {
      id: s.id,
      startedAt: s.startedAt,
      endedAt,
      focusMinutes,
      result: 'completed',
      ...(s.labelId ? { labelId: s.labelId } : {}),
    }),
  });

  return {
    state: completed.state,
    events: [
      {
        type: 'completed',
        at: now,
        xpGained: result.xpGained,
        happinessGained: result.happinessGained,
        stagedUp: result.stagedUp,
        hatched: result.hatched,
        fromStage: result.fromStage,
        toStage: result.toStage,
        nextBreak: next.phase,
        longBreakEarned: next.longBreakEarned,
        unlocked: completed.unlocked,
      },
    ],
  };
}

/** `endedAt` is when the user actually left (for leftApp / appClosed). */
export function abandonFocus(
  state: PersistedState,
  now: number,
  reason: AbandonReason,
  endedAt: number = now,
): Outcome {
  const s = state.active;
  if (!s || s.phase !== 'focus' || !state.creature) return same(state);
  const focusedMs = sessionDurationMs(s) - remainingMs(s, endedAt);
  const focusMinutes = Math.max(0, Math.round((focusedMs / 60_000) * 100) / 100);
  return {
    state: {
      ...state,
      creature: applyAbandon(state.creature),
      active: null,
      history: pushHistory(state.history, {
        id: s.id,
        startedAt: s.startedAt,
        endedAt,
        focusMinutes,
        result: 'abandoned',
        abandonReason: reason,
        ...(s.labelId ? { labelId: s.labelId } : {}),
      }),
    },
    events: [{ type: 'abandoned', at: now, reason }],
  };
}

export function endBreak(state: PersistedState, now: number): Outcome {
  const s = state.active;
  if (!s || s.phase === 'focus') return same(state);
  return { state: { ...state, active: null }, events: [{ type: 'breakEnded', at: now }] };
}

/** Skip the running break, or the earned break that has not started yet. */
export function skipBreak(state: PersistedState): PersistedState {
  if (state.active && state.active.phase !== 'focus') return { ...state, active: null };
  if (state.pendingBreak) return { ...state, pendingBreak: null };
  return state;
}

export function markHidden(state: PersistedState, now: number): PersistedState {
  const s = state.active;
  if (!s || s.hiddenAt !== null) return state;
  return { ...state, active: { ...s, hiddenAt: now, lastSeenAt: now } };
}

export function heartbeat(state: PersistedState, now: number): PersistedState {
  const s = state.active;
  if (!s || s.hiddenAt !== null) return state;
  return { ...state, active: { ...s, lastSeenAt: now } };
}

function applyDecision(
  state: PersistedState,
  decision: ReturnDecision,
  now: number,
  leftAt: number,
  reason: AbandonReason,
): Outcome {
  switch (decision) {
    case 'complete':
      return completeFocus(state, now);
    case 'abandon':
      return abandonFocus(state, now, reason, leftAt);
    case 'endBreak':
      return endBreak(state, now);
    case 'resume':
    case 'none': {
      const s = state.active;
      if (!s) return same(state);
      const wasAway = s.hiddenAt !== null && s.phase === 'focus' && s.pausedAt === null;
      return {
        state: { ...state, active: { ...s, hiddenAt: null, lastSeenAt: now } },
        events: decision === 'resume' && wasAway ? [{ type: 'relief', at: now }] : [],
      };
    }
  }
}

/** The page became visible again: decide using the saved hiddenAt. */
export function markVisible(state: PersistedState, now: number): Outcome {
  const s = state.active;
  let out: Outcome = same(state);
  if (s) {
    const decision = decideOnVisible(s, now, graceMs(state));
    out = applyDecision(state, decision, now, s.hiddenAt ?? now, 'leftApp');
  }
  return { state: dailyChecks(out.state, now), events: out.events };
}

/** App start (reload or relaunch): decide using hiddenAt or the last heartbeat. */
export function onStartup(state: PersistedState, now: number): Outcome {
  const s = state.active;
  let out: Outcome = same(state);
  if (s) {
    const decision = decideOnStartup(s, now, graceMs(state));
    const leftAt = s.hiddenAt ?? s.lastSeenAt;
    out = applyDecision(state, decision, now, leftAt, s.hiddenAt ? 'leftApp' : 'appClosed');
    // A quick reload is not "coming back" from leaving; no relief line.
    if (decision === 'resume') out = { ...out, events: [] };
  }
  // Also catches items earned before an upgrade from V1.
  return { state: withUnlocks(dailyChecks(out.state, now)).state, events: out.events };
}

/** Called ~4x per second while visible: end sessions whose time is up. */
export function tick(state: PersistedState, now: number): Outcome {
  const s = state.active;
  if (!s) return same(state);
  if (s.hiddenAt !== null) return markVisible(state, now);
  if (!isTimeUp(s, now)) return same(state);
  return s.phase === 'focus' ? completeFocus(state, now) : endBreak(state, now);
}
