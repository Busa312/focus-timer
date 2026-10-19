import { DEFAULT_GAME_RECORDS } from '../config';
import { beats, bestText, recordScore } from './games';

describe('mini game high scores', () => {
  it('Catch the treats: higher is better', () => {
    expect(beats('catch', 10, null)).toBe(true);
    expect(beats('catch', 11, 10)).toBe(true);
    expect(beats('catch', 10, 10)).toBe(false);
    expect(beats('catch', 9, 10)).toBe(false);
  });

  it('Memory match: fewer moves is better', () => {
    expect(beats('memory', 14, null)).toBe(true);
    expect(beats('memory', 12, 14)).toBe(true);
    expect(beats('memory', 14, 14)).toBe(false);
    expect(beats('memory', 20, 14)).toBe(false);
  });

  it('counts every play and keeps only the best score', () => {
    let r = recordScore(DEFAULT_GAME_RECORDS, 'catch', 12);
    expect(r).toEqual({
      records: { ...DEFAULT_GAME_RECORDS, catch: { best: 12, plays: 1 } },
      isNewBest: true,
    });
    r = recordScore(r.records, 'catch', 8);
    expect(r.isNewBest).toBe(false);
    expect(r.records.catch).toEqual({ best: 12, plays: 2 });
    r = recordScore(r.records, 'catch', 30);
    expect(r.records.catch).toEqual({ best: 30, plays: 3 });
    expect(r.records.memory).toEqual({ best: null, plays: 0 });
  });

  it('describes the best score', () => {
    expect(bestText('catch', null)).toBe('No score yet');
    expect(bestText('catch', 42)).toBe('Best: 42 points');
    expect(bestText('memory', 16)).toBe('Best: 16 moves');
  });
});
