import { GAMES } from '../config';
import type { GameId, GameRecords } from '../types';

/** Whether `score` beats `best` for this game (higher or lower is better). */
export function beats(game: GameId, score: number, best: number | null): boolean {
  if (best === null) return true;
  return GAMES[game].better === 'higher' ? score > best : score < best;
}

/** Record a finished game: count the play and keep the best score. */
export function recordScore(
  records: GameRecords,
  game: GameId,
  score: number,
): { records: GameRecords; isNewBest: boolean } {
  const current = records[game];
  const isNewBest = beats(game, score, current.best);
  return {
    records: {
      ...records,
      [game]: { best: isNewBest ? score : current.best, plays: current.plays + 1 },
    },
    isNewBest,
  };
}

export function bestText(game: GameId, best: number | null): string {
  return best === null ? 'No score yet' : `Best: ${best} ${GAMES[game].unit}`;
}
