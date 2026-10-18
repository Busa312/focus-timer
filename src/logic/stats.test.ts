import type { SessionRecord } from '../types';
import { dailyFocus, formatDuration, totals } from './stats';

const at = (d: number, h = 10) => new Date(2026, 9, d, h).getTime();

function rec(
  day: number,
  minutes: number,
  result: SessionRecord['result'] = 'completed',
  hour = 10,
) {
  return {
    id: `${day}-${hour}-${minutes}`,
    startedAt: at(day, hour) - minutes * 60_000,
    endedAt: at(day, hour),
    focusMinutes: minutes,
    result,
  } satisfies SessionRecord;
}

describe('totals', () => {
  it('counts completed focus time and both outcomes', () => {
    const t = totals([rec(18, 25), rec(19, 50), rec(19, 7, 'abandoned')]);
    expect(t).toEqual({ focusMinutes: 75, completed: 2, abandoned: 1 });
  });

  it('is zero for an empty history', () => {
    expect(totals([])).toEqual({ focusMinutes: 0, completed: 0, abandoned: 0 });
  });
});

describe('dailyFocus', () => {
  it('returns the last 7 days oldest first, completed sessions only', () => {
    const days = dailyFocus(
      [
        rec(10, 25),
        rec(13, 25),
        rec(19, 25),
        rec(19, 25, 'completed', 15),
        rec(19, 10, 'abandoned'),
      ],
      '2026-10-19',
      7,
    );
    expect(days.map((d) => d.date)).toEqual([
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
    ]);
    expect(days.map((d) => d.minutes)).toEqual([25, 0, 0, 0, 0, 0, 50]);
  });

  it('assigns a session to the local day it ended', () => {
    const late = { ...rec(18, 25), endedAt: new Date(2026, 9, 19, 0, 5).getTime() };
    expect(dailyFocus([late], '2026-10-19', 2).map((d) => d.minutes)).toEqual([0, 25]);
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0m'],
    [45, '45m'],
    [60, '1h'],
    [200, '3h 20m'],
  ])('%i -> %s', (m, out) => expect(formatDuration(m)).toBe(out));
});
