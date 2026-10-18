import type { GameEvent } from '../logic/engine';
import type { ActiveSession, CreatureState } from '../types';

/** Short-lived states override the mood face. */
export function creatureStateFor(
  active: ActiveSession | null,
  event: GameEvent | null,
): CreatureState {
  if (event?.type === 'completed') return 'celebrating';
  if (event?.type === 'abandoned') return 'disappointed';
  if (!active) return 'idle';
  if (active.phase === 'focus') {
    if (active.hiddenAt !== null && active.pausedAt === null) return 'worried';
    return active.pausedAt !== null ? 'idle' : 'focused';
  }
  return 'playing';
}
