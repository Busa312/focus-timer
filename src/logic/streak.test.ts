import { addDays, daysBetween, startOfDay, toDateKey } from './dates';
import { EMPTY_STREAK, recordCompletion, refreshStreak } from './streak';

describe('dates', () => {
  it('formats local date keys', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05');
  });

  it('steps days across months, years and DST', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 3)).toBe('2026-10-27');
  });

  it('counts days between keys', () => {
    expect(daysBetween('2026-10-19', '2026-10-19')).toBe(0);
    expect(daysBetween('2026-10-15', '2026-10-19')).toBe(4);
    expect(daysBetween('2026-10-19', '2026-10-18')).toBe(-1);
  });

  it('finds local midnight', () => {
    expect(startOfDay('2026-10-19')).toBe(new Date(2026, 9, 19).getTime());
  });
});

describe('recordCompletion', () => {
  it('starts a streak at 1', () => {
    expect(recordCompletion(EMPTY_STREAK, '2026-10-19')).toEqual({
      current: 1,
      best: 1,
      lastCompletedDate: '2026-10-19',
    });
  });

  it('only counts a day once', () => {
    const s = recordCompletion(EMPTY_STREAK, '2026-10-19');
    expect(recordCompletion(s, '2026-10-19')).toEqual(s);
  });

  it('grows on consecutive days and tracks best', () => {
    let s = EMPTY_STREAK;
    for (const d of ['2026-10-17', '2026-10-18', '2026-10-19']) s = recordCompletion(s, d);
    expect(s).toEqual({ current: 3, best: 3, lastCompletedDate: '2026-10-19' });
  });

  it('restarts at 1 after a gap, keeping best', () => {
    const s = recordCompletion(
      { current: 5, best: 5, lastCompletedDate: '2026-10-10' },
      '2026-10-19',
    );
    expect(s).toEqual({ current: 1, best: 5, lastCompletedDate: '2026-10-19' });
  });
});

describe('refreshStreak', () => {
  const s = { current: 4, best: 6, lastCompletedDate: '2026-10-18' };

  it('keeps the streak if the last session was today or yesterday', () => {
    expect(refreshStreak(s, '2026-10-18')).toBe(s);
    expect(refreshStreak(s, '2026-10-19')).toBe(s);
  });

  it('resets to 0 when a whole day was missed', () => {
    expect(refreshStreak(s, '2026-10-20')).toEqual({ ...s, current: 0 });
  });

  it('leaves an empty streak alone', () => {
    expect(refreshStreak(EMPTY_STREAK, '2026-10-20')).toBe(EMPTY_STREAK);
  });
});
