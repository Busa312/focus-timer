import type { ActiveSession } from '../types';
import { decideOnStartup, decideOnVisible, graceRemainingMs } from './leave';
import { createSession, pauseSession } from './timer';

const T0 = 1_800_000_000_000;
const MIN = 60_000;
const GRACE = 10_000;

function focus(overrides: Partial<ActiveSession> = {}): ActiveSession {
  return { ...createSession('focus', T0, 25 * MIN, 'f'), ...overrides };
}

describe('decideOnVisible (grace period)', () => {
  it('forgives leaving for 5 s', () => {
    const s = focus({ hiddenAt: T0 + MIN });
    expect(decideOnVisible(s, T0 + MIN + 5_000, GRACE)).toBe('resume');
  });

  it('forgives exactly the grace period', () => {
    const s = focus({ hiddenAt: T0 + MIN });
    expect(decideOnVisible(s, T0 + MIN + GRACE, GRACE)).toBe('resume');
  });

  it('abandons after 15 s away', () => {
    const s = focus({ hiddenAt: T0 + MIN });
    expect(decideOnVisible(s, T0 + MIN + 15_000, GRACE)).toBe('abandon');
  });

  it('strict mode (0 s grace) abandons any hide', () => {
    const s = focus({ hiddenAt: T0 + MIN });
    expect(decideOnVisible(s, T0 + MIN + 1, 0)).toBe('abandon');
  });

  it('counts as completed if hidden after the timer already ended', () => {
    const s = focus({ hiddenAt: T0 + 26 * MIN });
    expect(decideOnVisible(s, T0 + 90 * MIN, GRACE)).toBe('complete');
  });

  it('counts as completed if left before endsAt but returned within grace after it', () => {
    const s = focus({ hiddenAt: T0 + 25 * MIN - 3_000 });
    expect(decideOnVisible(s, T0 + 25 * MIN + 4_000, GRACE)).toBe('complete');
  });

  it('counts as completed if the timer ran out inside the grace window, even if away longer', () => {
    const s = focus({ hiddenAt: T0 + 25 * MIN - 3_000 });
    expect(decideOnVisible(s, T0 + 40 * MIN, GRACE)).toBe('complete');
  });

  it('abandons when the timer had more than the grace period left', () => {
    const s = focus({ hiddenAt: T0 + 25 * MIN - 30_000 });
    expect(decideOnVisible(s, T0 + 40 * MIN, GRACE)).toBe('abandon');
  });

  it('allows leaving while paused', () => {
    const s = { ...pauseSession(focus(), T0 + MIN), hiddenAt: T0 + MIN };
    expect(decideOnVisible(s, T0 + 60 * MIN, GRACE)).toBe('none');
  });

  it('allows leaving during a break, ending it if it ran out', () => {
    const b = { ...createSession('shortBreak', T0, 5 * MIN, 'b'), hiddenAt: T0 + MIN };
    expect(decideOnVisible(b, T0 + 2 * MIN, GRACE)).toBe('none');
    expect(decideOnVisible(b, T0 + 6 * MIN, GRACE)).toBe('endBreak');
  });

  it('does nothing if the page was never hidden', () => {
    expect(decideOnVisible(focus(), T0 + MIN, GRACE)).toBe('none');
  });
});

describe('decideOnStartup (app killed or reloaded)', () => {
  it('resumes after a quick reload', () => {
    const s = focus({ lastSeenAt: T0 + 2 * MIN });
    expect(decideOnStartup(s, T0 + 2 * MIN + 4_000, GRACE)).toBe('resume');
  });

  it('abandons when reopened a minute later', () => {
    const s = focus({ lastSeenAt: T0 + 2 * MIN });
    expect(decideOnStartup(s, T0 + 3 * MIN, GRACE)).toBe('abandon');
  });

  it('uses hiddenAt when the page was hidden before it was killed', () => {
    const s = focus({ lastSeenAt: T0 + 2 * MIN, hiddenAt: T0 + 2 * MIN + 3_000 });
    expect(decideOnStartup(s, T0 + 2 * MIN + 12_000, GRACE)).toBe('resume');
    expect(decideOnStartup(s, T0 + 2 * MIN + 14_000, GRACE)).toBe('abandon');
  });

  it('completes if the timer ended before the app was closed', () => {
    const s = focus({ lastSeenAt: T0 + 25 * MIN + 1_000 });
    expect(decideOnStartup(s, T0 + 60 * MIN, GRACE)).toBe('complete');
  });

  it('keeps a paused session paused', () => {
    const s = pauseSession(focus({ lastSeenAt: T0 + MIN }), T0 + MIN);
    expect(decideOnStartup(s, T0 + 60 * MIN, GRACE)).toBe('none');
  });

  it('ends a break that ran out while closed', () => {
    const b = createSession('longBreak', T0, 15 * MIN, 'b');
    expect(decideOnStartup(b, T0 + 20 * MIN, GRACE)).toBe('endBreak');
    expect(decideOnStartup(b, T0 + 10 * MIN, GRACE)).toBe('none');
  });
});

describe('graceRemainingMs', () => {
  it('counts down from the grace period', () => {
    expect(graceRemainingMs(T0, T0 + 3_000, GRACE)).toBe(7_000);
    expect(graceRemainingMs(T0, T0 + 30_000, GRACE)).toBe(0);
  });
});
