import { useId, useState } from 'react';

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
}

/** − value + control with 44 px targets. */
export function Stepper({ label, value, min, max, step = 1, unit, onChange }: StepperProps) {
  const id = useId();
  // What the user is typing; clamped only when they leave the field, so "30"
  // can be typed even though "3" alone is below the minimum.
  const [text, setText] = useState<string | null>(null);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const commit = () => {
    if (text === null) return;
    const v = Number(text);
    if (text.trim() !== '' && Number.isFinite(v)) onChange(clamp(Math.round(v)));
    setText(null);
  };
  const btn =
    'flex h-11 w-11 items-center justify-center rounded-full bg-cream text-xl font-extrabold focus-visible:outline-3 focus-visible:outline-sky-500 disabled:opacity-40 dark:bg-night';
  // Fractional values (dev fast mode) are shown rounded but stay as set until changed.
  const shown = Number.isInteger(value) ? value : Math.round(value * 10) / 10;
  return (
    <div className="flex min-h-12 items-center justify-between gap-3">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={btn}
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(clamp(Math.ceil(value - step)))}
        >
          −
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={text ?? shown}
          onChange={(e) => {
            const raw = e.target.value;
            setText(raw);
            const v = Math.round(Number(raw));
            // Apply right away when already valid, so Save enables while typing.
            if (raw.trim() !== '' && v >= min && v <= max) onChange(v);
          }}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="tabular h-11 w-14 rounded-xl bg-transparent text-center text-lg font-extrabold outline-none focus-visible:ring-3 focus-visible:ring-sky-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          className={btn}
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(clamp(Math.floor(value + step)))}
        >
          +
        </button>
        <span className="w-8 text-sm opacity-60">{unit}</span>
      </div>
    </div>
  );
}

interface ToggleProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle({ label, hint, checked, onChange }: ToggleProps) {
  const id = useId();
  return (
    <div className="flex min-h-12 items-center justify-between gap-3">
      <div>
        <label htmlFor={id} className="font-bold">
          {label}
        </label>
        {hint && <p className="text-xs opacity-65">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-500 motion-reduce:transition-none ${
          checked ? 'bg-emerald-500' : 'bg-ink/20 dark:bg-white/20'
        }`}
      >
        <span
          className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${
            checked ? 'translate-x-6' : ''
          }`}
        />
      </button>
    </div>
  );
}
