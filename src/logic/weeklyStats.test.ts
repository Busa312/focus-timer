import type { Label, SessionRecord, Streak } from '../types';
import { addDays, toDateKey } from './dates';
import { focusByLabel, weekSummary } from './weeklyStats';

const TODAY = '2026-10-19';
const at = (daysAgo: number, hour = 10) => {
  const d = new Date(2026, 9, 19 - daysAgo, hour);
  return d.getTime();
};

const LABELS: Label[] = [
  { id: 'study', name: 'Study', color: '#f7a8b8', archived: false },
  { id: 'work', name: 'Work', color: '#9cc6f0', archived: false },
  { id: 'old', name: 'Old', color: '#a8dcae', archived: true },
];

function rec(
  daysAgo: number,
  minutes: number,
  labelId?: string,
  result: SessionRecord['result'] = 'completed',
): SessionRecord {
  return {
    id: `${daysAgo}-${minutes}-${labelId}-${Math.random()}`,
    startedAt: at(daysAgo) - minutes * 60_000,
    endedAt: at(daysAgo),
    focusMinutes: minutes,
    result,
    ...(labelId ? { labelId } : {}),
  };
}

describe('focusByLabel', () => {
  const history = [
    rec(0, 25, 'study'),
    rec(1, 50, 'study'),
    rec(2, 25, 'work'),
    rec(3, 25),
    rec(6, 25, 'old'), // last day inside 7
    rec(7, 90, 'work'), // first day outside 7
    rec(29, 25, 'study'), // last day inside 30
    rec(30, 25, 'study'), // outside 30
    rec(0, 10, 'work', 'abandoned'), // abandoned never counts
  ];

  it('sums the last 7 days per label, largest first, archived kept', () => {
    expect(
      focusByLabel(history, LABELS, TODAY, 7).map((r) => [
        r.name,
        r.minutes,
        r.sessions,
        r.archived,
      ]),
    ).toEqual([
      ['Study', 75, 2, false],
      ['No label', 25, 1, false],
      ['Old', 25, 1, true],
      ['Work', 25, 1, false],
    ]);
  });

  it('sums the last 30 days per label', () => {
    expect(focusByLabel(history, LABELS, TODAY, 30).map((r) => [r.name, r.minutes])).toEqual([
      ['Work', 115],
      ['Study', 100],
      ['No label', 25],
      ['Old', 25],
    ]);
  });

  it('counts sessions whose label no longer exists as No label', () => {
    expect(focusByLabel([rec(0, 25, 'gone')], LABELS, TODAY, 7)).toEqual([
      { labelId: null, name: 'No label', color: null, archived: false, minutes: 25, sessions: 1 },
    ]);
  });

  it('matches a brute-force count over a random history', () => {
    // Deterministic pseudo-random history over 60 days.
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const ids = [undefined, 'study', 'work', 'old'];
    const random: SessionRecord[] = Array.from({ length: 400 }, () =>
      rec(
        Math.floor(rand() * 60),
        [25, 50, 90, 1][Math.floor(rand() * 4)],
        ids[Math.floor(rand() * 4)],
        rand() < 0.2 ? 'abandoned' : 'completed',
      ),
    );
    for (const days of [7, 30]) {
      const first = addDays(TODAY, -(days - 1));
      const expected = new Map<string, number>();
      for (const h of random) {
        const d = toDateKey(h.endedAt);
        if (h.result !== 'completed' || d < first || d > TODAY) continue;
        const key = h.labelId ?? 'none';
        expected.set(key, (expected.get(key) ?? 0) + h.focusMinutes);
      }
      const actual = new Map(
        focusByLabel(random, LABELS, TODAY, days).map((r) => [r.labelId ?? 'none', r.minutes]),
      );
      expect(actual).toEqual(expected);
    }
  });
});

describe('weekSummary', () => {
  const streak: Streak = { current: 4, best: 9, lastCompletedDate: TODAY };

  it('totals the last 7 days and finds the top label', () => {
    const s = weekSummary(
      [
        rec(0, 25, 'work'),
        rec(1, 50, 'study'),
        rec(2, 90),
        rec(9, 90, 'work'),
        rec(0, 5, 'work', 'abandoned'),
      ],
      LABELS,
      streak,
      TODAY,
    );
    expect(s).toEqual({
      focusMinutes: 165,
      sessions: 3,
      streak: 4,
      topLabel: { name: 'Study', color: '#f7a8b8', minutes: 50 },
    });
  });

  it('has no top label when nothing was labeled', () => {
    expect(weekSummary([rec(0, 25)], LABELS, streak, TODAY).topLabel).toBeNull();
  });
});
