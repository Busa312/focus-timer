import type { PersistedState } from '../types';
import * as engine from './engine';

const MIN = 60_000;
const T0 = new Date(2026, 9, 19, 9, 0).getTime();

function ready(overrides: Partial<PersistedState> = {}): PersistedState {
  return { ...engine.onboard(engine.initialState(), 'Pip', T0), ...overrides };
}

/** Start a focus session at `at` and let it run to completion. */
function completeOne(state: PersistedState, at: number) {
  const started = engine.startFocus(state, at, `s${at}`);
  return engine.tick(started, at + 25 * MIN);
}

describe('engine: focus cycle', () => {
  it('requires onboarding before starting', () => {
    const s = engine.initialState();
    expect(engine.startFocus(s, T0, 'a')).toBe(s);
  });

  it('only one active session at a time', () => {
    const s = engine.startFocus(ready(), T0, 'a');
    expect(engine.startFocus(s, T0 + 1, 'b')).toBe(s);
  });

  it('completes on tick at endsAt with rewards, history, streak and a pending break', () => {
    const s = engine.startFocus(ready(), T0, 'a');
    expect(engine.tick(s, T0 + 25 * MIN - 1).events).toEqual([]);
    const { state, events } = engine.tick(s, T0 + 25 * MIN);
    expect(state.active).toBeNull();
    expect(state.creature!.xp).toBe(25);
    expect(state.creature!.happiness).toBe(80);
    expect(state.cycleCount).toBe(1);
    expect(state.pendingBreak).toBe('shortBreak');
    expect(state.streak.current).toBe(1);
    expect(state.history).toHaveLength(1);
    expect(state.history[0]).toMatchObject({ result: 'completed', focusMinutes: 25 });
    expect(events[0]).toMatchObject({
      type: 'completed',
      xpGained: 25,
      happinessGained: 10,
      hatched: true,
      stagedUp: true,
      toStage: 'baby',
      nextBreak: 'shortBreak',
    });
  });

  it('every 4th session earns a long break and +5 bonus, then the cycle resets', () => {
    let s = ready({ creature: { ...ready().creature!, happiness: 0 } });
    const gains: number[] = [];
    for (let i = 0; i < 4; i++) {
      const out = completeOne(s, T0 + i * 40 * MIN);
      s = engine.skipBreak(out.state);
      const e = out.events[0];
      if (e.type === 'completed') gains.push(e.happinessGained);
    }
    expect(gains).toEqual([10, 10, 10, 15]);
    expect(s.cycleCount).toBe(0);

    const fifth = completeOne(s, T0 + 4 * 40 * MIN);
    expect(fifth.state.pendingBreak).toBe('shortBreak');
    expect(fifth.state.cycleCount).toBe(1);
  });

  it('starts the earned break with the right length and ends it on time', () => {
    const done = completeOne(ready(), T0).state;
    const b = engine.startBreak(done, T0 + 26 * MIN, 'b');
    expect(b.active).toMatchObject({ phase: 'shortBreak', endsAt: T0 + 31 * MIN });
    expect(b.pendingBreak).toBeNull();
    const ended = engine.tick(b, T0 + 31 * MIN);
    expect(ended.state.active).toBeNull();
    expect(ended.events[0].type).toBe('breakEnded');
  });

  it('skip break returns to idle (running or pending)', () => {
    const done = completeOne(ready(), T0).state;
    expect(engine.skipBreak(done).pendingBreak).toBeNull();
    const b = engine.startBreak(done, T0 + 26 * MIN, 'b');
    expect(engine.skipBreak(b).active).toBeNull();
  });

  it('starting focus discards an unstarted break', () => {
    const done = completeOne(ready(), T0).state;
    expect(engine.startFocus(done, T0 + 26 * MIN, 'c').pendingBreak).toBeNull();
  });

  it('pause holds the timer; resume extends endsAt', () => {
    let s = engine.startFocus(ready(), T0, 'a');
    s = engine.pause(s, T0 + 5 * MIN);
    expect(engine.tick(s, T0 + 60 * MIN).state.active).not.toBeNull();
    s = engine.resume(s, T0 + 15 * MIN);
    expect(s.active!.endsAt).toBe(T0 + 35 * MIN);
    expect(engine.tick(s, T0 + 35 * MIN).events[0].type).toBe('completed');
  });

  it('records completion on the day the timer ended', () => {
    const late = new Date(2026, 9, 19, 23, 50).getTime();
    let s = engine.startFocus(ready(), late, 'a');
    s = engine.markHidden(s, late + 25 * MIN - 5_000); // timer ends inside the grace window
    const out = engine.markVisible(s, late + 60 * MIN);
    expect(out.state.streak.lastCompletedDate).toBe('2026-10-20');
    expect(out.state.history[0].endedAt).toBe(late + 25 * MIN);
  });
});

describe('engine: give up', () => {
  it('applies -15 happiness and 0 XP and does not advance the cycle', () => {
    let s = completeOne(ready(), T0).state;
    s = engine.skipBreak(s);
    s = engine.startFocus(s, T0 + 30 * MIN, 'g');
    const { state, events } = engine.abandonFocus(s, T0 + 40 * MIN, 'gaveUp');
    expect(state.creature!.xp).toBe(25);
    expect(state.creature!.happiness).toBe(65);
    expect(state.creature!.pendingComeback).toBe(true);
    expect(state.cycleCount).toBe(1);
    expect(state.history[1]).toMatchObject({
      result: 'abandoned',
      abandonReason: 'gaveUp',
      focusMinutes: 10,
    });
    expect(events[0]).toMatchObject({ type: 'abandoned', reason: 'gaveUp' });
  });

  it('gives the comeback bonus on the next completed session', () => {
    let s = engine.startFocus(ready(), T0, 'g');
    s = engine.abandonFocus(s, T0 + MIN, 'gaveUp').state; // 70 -> 55
    const out = completeOne(s, T0 + 10 * MIN);
    expect(out.state.creature!.happiness).toBe(70); // +10 +5
  });
});

describe('engine: leaving the app', () => {
  it('forgives a 5 s absence with a relief event', () => {
    let s = engine.startFocus(ready(), T0, 'a');
    s = engine.markHidden(s, T0 + MIN);
    expect(s.active!.hiddenAt).toBe(T0 + MIN);
    const { state, events } = engine.markVisible(s, T0 + MIN + 5_000);
    expect(state.active!.hiddenAt).toBeNull();
    expect(events[0].type).toBe('relief');
  });

  it('abandons after 15 s away, recording when the user left', () => {
    let s = engine.startFocus(ready(), T0, 'a');
    s = engine.markHidden(s, T0 + 2 * MIN);
    const { state, events } = engine.markVisible(s, T0 + 2 * MIN + 15_000);
    expect(state.active).toBeNull();
    expect(state.creature!.happiness).toBe(55);
    expect(state.history[0]).toMatchObject({
      abandonReason: 'leftApp',
      endedAt: T0 + 2 * MIN,
      focusMinutes: 2,
    });
    expect(events[0]).toMatchObject({ type: 'abandoned', reason: 'leftApp' });
  });

  it('tick never decides while a hide is pending without checking the grace period', () => {
    let s = engine.startFocus(ready(), T0, 'a');
    s = engine.markHidden(s, T0 + MIN);
    expect(engine.tick(s, T0 + 2 * MIN).events[0].type).toBe('abandoned');
  });

  it('leaving while paused has no penalty', () => {
    let s = engine.startFocus(ready(), T0, 'a');
    s = engine.pause(s, T0 + MIN);
    s = engine.markHidden(s, T0 + MIN);
    const { state, events } = engine.markVisible(s, T0 + 30 * MIN);
    expect(events).toEqual([]);
    expect(state.active!.pausedAt).toBe(T0 + MIN);
    expect(state.active!.hiddenAt).toBeNull();
  });

  it('leaving during a break is fine', () => {
    let s = engine.startBreak(completeOne(ready(), T0).state, T0 + 25 * MIN, 'b');
    s = engine.markHidden(s, T0 + 26 * MIN);
    const { state, events } = engine.markVisible(s, T0 + 27 * MIN);
    expect(events).toEqual([]);
    expect(state.active!.phase).toBe('shortBreak');
  });
});

describe('engine: startup after the app was killed', () => {
  it('resumes after a quick reload', () => {
    let s = engine.startFocus(ready(), T0, 'a');
    s = engine.heartbeat(s, T0 + 5 * MIN);
    const { state, events } = engine.onStartup(s, T0 + 5 * MIN + 3_000);
    expect(state.active).not.toBeNull();
    expect(state.active!.lastSeenAt).toBe(T0 + 5 * MIN + 3_000);
    expect(events).toEqual([]);
  });

  it('abandons when reopened a minute later', () => {
    let s = engine.startFocus(ready(), T0, 'a');
    s = engine.heartbeat(s, T0 + 5 * MIN);
    const { state, events } = engine.onStartup(s, T0 + 6 * MIN);
    expect(state.active).toBeNull();
    expect(state.history[0]).toMatchObject({ abandonReason: 'appClosed', endedAt: T0 + 5 * MIN });
    expect(events[0]).toMatchObject({ type: 'abandoned', reason: 'appClosed' });
  });

  it('completes a session that ended before the app was closed', () => {
    let s = engine.startFocus(ready(), T0, 'a');
    s = engine.heartbeat(s, T0 + 25 * MIN + 2_000);
    const { state, events } = engine.onStartup(s, T0 + 90 * MIN);
    expect(state.creature!.xp).toBe(25);
    expect(events[0].type).toBe('completed');
  });
});

describe('engine: daily checks', () => {
  it('lowers happiness by 5 per missed day and resets the streak on open', () => {
    let s = completeOne(ready(), T0).state; // Oct 19, streak 1, happiness 80
    s = engine.skipBreak(s);
    const twoDaysLater = new Date(2026, 9, 21, 8, 0).getTime();
    const { state } = engine.onStartup(s, twoDaysLater);
    // Oct 20 was missed (19 had a session, 21 is today).
    expect(state.creature!.happiness).toBe(75);
    expect(state.streak.current).toBe(0);
    expect(state.streak.best).toBe(1);
  });

  it('keeps the streak when yesterday had a session', () => {
    let s = completeOne(ready(), T0).state;
    s = engine.skipBreak(s);
    const nextDay = new Date(2026, 9, 20, 8, 0).getTime();
    const out = completeOne(s, nextDay);
    expect(out.state.streak).toEqual({ current: 2, best: 2, lastCompletedDate: '2026-10-20' });
    expect(out.state.creature!.happiness).toBe(90);
  });
});

describe('engine: history', () => {
  it('keeps only the last 500 records', () => {
    let s = ready();
    s = {
      ...s,
      history: Array.from({ length: 500 }, (_, i) => ({
        id: `h${i}`,
        startedAt: i,
        endedAt: i,
        focusMinutes: 25,
        result: 'completed' as const,
      })),
    };
    const out = completeOne(s, T0).state;
    expect(out.history).toHaveLength(500);
    expect(out.history[0].id).toBe('h1');
    expect(out.history[499].result).toBe('completed');
  });
});

describe('engine: presets', () => {
  it.each([
    ['classic', 25, 5, 15],
    ['deep', 50, 10, 20],
    ['marathon', 90, 20, 30],
  ] as const)(
    '%s runs %i min focus for %i XP, then %i / %i min breaks',
    (presetId, focus, short, long) => {
      let s = ready();
      s = { ...s, settings: { ...s.settings, presetId } };
      s = engine.startFocus(s, T0, 'p');
      expect(s.active!.endsAt - s.active!.startedAt).toBe(focus * MIN);
      expect(engine.tick(s, T0 + focus * MIN - 1).events).toEqual([]);
      const out = engine.tick(s, T0 + focus * MIN);
      expect(out.state.creature!.xp).toBe(focus);
      expect(out.state.history[0].focusMinutes).toBe(focus);
      const b = engine.startBreak(out.state, T0 + focus * MIN, 'b');
      expect(b.active!.endsAt - b.active!.startedAt).toBe(short * MIN);

      let l: PersistedState = { ...out.state, cycleCount: 3, pendingBreak: null };
      l = engine.startFocus(l, T0, 'q');
      const lo = engine.tick(l, T0 + focus * MIN).state;
      const lb = engine.startBreak(lo, T0 + focus * MIN, 'c');
      expect(lb.active).toMatchObject({ phase: 'longBreak' });
      expect(lb.active!.endsAt - lb.active!.startedAt).toBe(long * MIN);
    },
  );

  it('custom uses the saved lengths', () => {
    let s = ready();
    s = { ...s, settings: { ...s.settings, presetId: 'custom', focusMin: 35 } };
    const out = engine.tick(engine.startFocus(s, T0, 'c'), T0 + 35 * MIN);
    expect(out.state.creature!.xp).toBe(35);
  });
});
