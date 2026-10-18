import { moodForHappiness } from '../logic/creature';
import type { Mood } from '../types';

const MOOD_COLOR: Record<Mood, string> = {
  ecstatic: 'bg-rose-400',
  happy: 'bg-emerald-400',
  meh: 'bg-amber-400',
  sad: 'bg-sky-400',
};

export function HappinessBar({ value }: { value: number }) {
  const mood = moodForHappiness(value);
  return (
    <div className="flex items-center gap-2" title={`Happiness ${value} / 100`}>
      <span aria-hidden="true" className="text-sm">
        {value >= 50 ? '♥' : '♡'}
      </span>
      <div
        role="meter"
        aria-label="Happiness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="h-2.5 w-28 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10"
      >
        <div
          className={`h-full rounded-full ${MOOD_COLOR[mood]} transition-[width] duration-500 motion-reduce:transition-none`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="tabular w-7 text-xs opacity-70">{value}</span>
    </div>
  );
}
