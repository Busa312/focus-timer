import { DEFAULT_SETTINGS } from '../config';
import {
  breakAfterFocus,
  createSession,
  elapsedFraction,
  focusMinutesOf,
  formatClock,
  isTimeUp,
  pauseSession,
  phaseDurationMs,
  remainingMs,
  resumeSession,
  sessionDurationMs,
} from './timer';

const T0 = 1_800_000_000_000;
const MIN = 60_000;

describe('phaseDurationMs', () => {
  it('uses the settings for each phase', () => {
    expect(phaseDurationMs('focus', DEFAULT_SETTINGS)).toBe(25 * MIN);
    expect(phaseDurationMs('shortBreak', DEFAULT_SETTINGS)).toBe(5 * MIN);
    expect(phaseDurationMs('longBreak', DEFAULT_SETTINGS)).toBe(15 * MIN);
  });

  it('supports fractional minutes (fast mode 10 s breaks)', () => {
    expect(
      phaseDurationMs('shortBreak', {
        ...DEFAULT_SETTINGS,
        presetId: 'custom',
        shortBreakMin: 10 / 60,
      }),
    ).toBe(10_000);
  });
});

describe('remaining time', () => {
  const s = createSession('focus', T0, 25 * MIN, 'a');

  it('is endsAt - now', () => {
    expect(remainingMs(s, T0)).toBe(25 * MIN);
    expect(remainingMs(s, T0 + 6 * MIN)).toBe(19 * MIN);
  });

  it('never goes negative', () => {
    expect(remainingMs(s, T0 + 30 * MIN)).toBe(0);
  });

  it('reports elapsed fraction', () => {
    expect(elapsedFraction(s, T0)).toBe(0);
    expect(elapsedFraction(s, T0 + 12.5 * MIN)).toBe(0.5);
    expect(elapsedFraction(s, T0 + 99 * MIN)).toBe(1);
  });

  it('is time up exactly at endsAt', () => {
    expect(isTimeUp(s, T0 + 25 * MIN - 1)).toBe(false);
    expect(isTimeUp(s, T0 + 25 * MIN)).toBe(true);
  });
});

describe('pause and resume', () => {
  const s = createSession('focus', T0, 25 * MIN, 'a');

  it('freezes remaining time while paused', () => {
    const p = pauseSession(s, T0 + 5 * MIN);
    expect(remainingMs(p, T0 + 5 * MIN)).toBe(20 * MIN);
    expect(remainingMs(p, T0 + 50 * MIN)).toBe(20 * MIN);
    expect(isTimeUp(p, T0 + 50 * MIN)).toBe(false);
  });

  it('pushes endsAt forward by the paused duration on resume', () => {
    const p = pauseSession(s, T0 + 5 * MIN);
    const r = resumeSession(p, T0 + 8 * MIN);
    expect(r.endsAt).toBe(T0 + 28 * MIN);
    expect(r.pausedTotalMs).toBe(3 * MIN);
    expect(r.pausedAt).toBeNull();
    expect(remainingMs(r, T0 + 8 * MIN)).toBe(20 * MIN);
    expect(sessionDurationMs(r)).toBe(25 * MIN);
  });

  it('accumulates multiple pauses', () => {
    let x = pauseSession(s, T0 + MIN);
    x = resumeSession(x, T0 + 2 * MIN);
    x = pauseSession(x, T0 + 3 * MIN);
    x = resumeSession(x, T0 + 5 * MIN);
    expect(x.pausedTotalMs).toBe(3 * MIN);
    expect(x.endsAt).toBe(T0 + 28 * MIN);
    expect(focusMinutesOf(x)).toBe(25);
  });

  it('ignores double pause / resume without pause', () => {
    const p = pauseSession(s, T0 + MIN);
    expect(pauseSession(p, T0 + 2 * MIN)).toBe(p);
    expect(resumeSession(s, T0 + 2 * MIN)).toBe(s);
  });

  it('cannot pause once time is up', () => {
    expect(pauseSession(s, T0 + 25 * MIN)).toBe(s);
  });
});

describe('breakAfterFocus', () => {
  it('gives short breaks until the 4th session, then a long break and resets', () => {
    expect(breakAfterFocus(0, 4)).toEqual({
      phase: 'shortBreak',
      cycleCount: 1,
      longBreakEarned: false,
    });
    expect(breakAfterFocus(2, 4)).toEqual({
      phase: 'shortBreak',
      cycleCount: 3,
      longBreakEarned: false,
    });
    expect(breakAfterFocus(3, 4)).toEqual({
      phase: 'longBreak',
      cycleCount: 0,
      longBreakEarned: true,
    });
  });

  it('respects a custom sessionsPerLongBreak', () => {
    expect(breakAfterFocus(1, 2).phase).toBe('longBreak');
  });
});

describe('formatClock', () => {
  it.each([
    [25 * MIN, '25:00'],
    [18 * MIN + 42_000, '18:42'],
    [999, '00:01'],
    [0, '00:00'],
    [90 * MIN, '1:30:00'],
  ])('%i ms -> %s', (ms, out) => {
    expect(formatClock(ms)).toBe(out);
  });
});
