import { useState } from 'react';
import { toDateKey } from '../logic/dates';
import { formatDuration } from '../logic/stats';
import { focusByLabel } from '../logic/weeklyStats';
import type { Label, SessionRecord } from '../types';
import { LabelDot } from './LabelPicker';

const RANGES = [7, 30] as const;

/** Focus minutes per label as horizontal bars, for the last 7 or 30 days. */
export function LabelBreakdown({
  history,
  labels,
}: {
  history: readonly SessionRecord[];
  labels: readonly Label[];
}) {
  const [days, setDays] = useState<(typeof RANGES)[number]>(7);
  const rows = focusByLabel(history, labels, toDateKey(Date.now()), days);
  const max = Math.max(1, ...rows.map((r) => r.minutes));

  return (
    <section aria-labelledby="by-label">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="by-label" className="font-bold">
          By label
        </h2>
        <div
          role="radiogroup"
          aria-label="Range"
          className="flex rounded-full bg-ink/5 p-0.5 dark:bg-white/10"
        >
          {RANGES.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={d === days}
              onClick={() => setDays(d)}
              className={`min-h-9 rounded-full px-3 text-xs font-bold focus-visible:outline-3 focus-visible:outline-sky-500 ${
                d === days ? 'bg-white shadow-sm dark:bg-dusk' : 'opacity-60'
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm opacity-70">No completed sessions in the last {days} days.</p>
      ) : (
        <ul className="flex flex-col gap-2.5" data-testid="label-rows">
          {rows.map((r) => (
            <li key={r.labelId ?? 'none'} data-label={r.name}>
              <div className="mb-1 flex items-center gap-2 text-sm">
                <LabelDot color={r.color} />
                <span className="flex-1 truncate font-bold">
                  {r.name}
                  {r.archived && (
                    <span className="ml-1.5 text-xs font-normal opacity-60">archived</span>
                  )}
                </span>
                <span className="tabular opacity-80">{formatDuration(r.minutes)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-ink/5 dark:bg-white/10" aria-hidden="true">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(2, (r.minutes / max) * 100)}%`,
                    backgroundColor: r.color ?? 'rgb(150 140 135)',
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
