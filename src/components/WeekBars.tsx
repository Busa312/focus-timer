import { useState } from 'react';
import { formatDuration } from '../logic/stats';

interface Day {
  date: string;
  minutes: number;
}

const weekday = (date: string, style: 'narrow' | 'short' | 'long') => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: style });
};

/** Focus minutes per day as simple vertical bars, with a tap / hover readout. */
export function WeekBars({ days }: { days: Day[] }) {
  const today = days.length - 1;
  const [selected, setSelected] = useState<number>(today);
  const max = Math.max(1, ...days.map((d) => d.minutes));
  const sel = days[selected];

  return (
    <figure className="m-0">
      <figcaption className="mb-3 flex items-baseline justify-between">
        <span className="font-bold">Last 7 days</span>
        <span className="text-sm opacity-75" aria-live="polite">
          {weekday(sel.date, 'long')}: <strong>{formatDuration(sel.minutes)}</strong>
        </span>
      </figcaption>
      <div
        className="flex h-32 items-end gap-2 border-b border-ink/15 dark:border-white/15"
        aria-hidden="true"
      >
        {days.map((d, i) => (
          <button
            key={d.date}
            type="button"
            tabIndex={-1}
            onMouseEnter={() => setSelected(i)}
            onFocus={() => setSelected(i)}
            onClick={() => setSelected(i)}
            className="group flex h-full flex-1 cursor-pointer items-end justify-center"
          >
            <span
              className={`w-3/5 max-w-6 rounded-t-[4px] transition-opacity ${
                d.minutes > 0 ? 'bg-[#e0712f] dark:bg-[#e06a2a]' : 'bg-transparent'
              } ${i === selected ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}
              style={{ height: d.minutes > 0 ? `${Math.max(4, (d.minutes / max) * 100)}%` : 0 }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2 text-center text-xs" aria-hidden="true">
        {days.map((d, i) => (
          <span key={d.date} className={`flex-1 ${i === today ? 'font-extrabold' : 'opacity-60'}`}>
            {weekday(d.date, 'narrow')}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Focus minutes, last 7 days</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Focus</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <th scope="row">{weekday(d.date, 'long')}</th>
              <td>{formatDuration(d.minutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
