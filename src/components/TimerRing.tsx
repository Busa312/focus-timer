import type { ReactNode } from 'react';

const R = 88;
const C = 2 * Math.PI * R;

interface Props {
  /** Fraction of the ring that is filled, 0..1. */
  progress: number;
  /** Tailwind stroke class for the filled part. */
  tone: string;
  children: ReactNode;
}

export function TimerRing({ progress, tone, children }: Props) {
  const p = Math.min(1, Math.max(0, progress));
  return (
    <div className="relative aspect-square w-full max-w-[208px]">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          strokeWidth="12"
          className="stroke-ink/[0.07] dark:stroke-white/10"
        />
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - p)}
          opacity={p > 0 ? 1 : 0}
          className={`${tone} transition-[stroke-dashoffset] duration-300 ease-linear motion-reduce:transition-none`}
          data-testid="ring-progress"
          data-progress={p.toFixed(3)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
