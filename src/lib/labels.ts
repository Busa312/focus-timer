import type { ActivePhase, Stage } from '../types';

export const STAGE_LABEL: Record<Stage, string> = {
  egg: 'Egg',
  baby: 'Baby',
  kid: 'Kid',
  teen: 'Teen',
  adult: 'Adult',
};

export const PHASE_LABEL: Record<ActivePhase, string> = {
  focus: 'Focus',
  shortBreak: 'Short break',
  longBreak: 'Long break',
};

/** Tailwind stroke / background tones per phase. */
export const PHASE_TONE: Record<ActivePhase, { stroke: string; bg: string; text: string }> = {
  focus: { stroke: 'stroke-fox', bg: 'bg-fox', text: 'text-fox' },
  shortBreak: { stroke: 'stroke-emerald-400', bg: 'bg-emerald-400', text: 'text-emerald-500' },
  longBreak: { stroke: 'stroke-sky-400', bg: 'bg-sky-400', text: 'text-sky-500' },
};
