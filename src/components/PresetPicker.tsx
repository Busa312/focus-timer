import { useState } from 'react';
import { PRESET_NAMES, PRESET_ORDER, PRESETS } from '../config';
import { timerLengths } from '../logic/timer';
import { useAppStore } from '../store/useAppStore';
import type { PresetId, Settings } from '../types';
import { Sheet } from './Sheet';

const fmt = (m: number) => (Number.isInteger(m) ? `${m}` : `${Math.round(m * 60)}s`);

function presetSummary(id: PresetId, settings: Settings): string {
  const t = id === 'custom' ? timerLengths({ ...settings, presetId: 'custom' }) : PRESETS[id];
  return `${fmt(t.focusMin)} / ${fmt(t.shortBreakMin)} / ${fmt(t.longBreakMin)}`;
}

/** Radio list of presets, shared by the Home sheet and Settings. */
export function PresetOptions({
  value,
  settings,
  onChange,
}: {
  value: PresetId;
  settings: Settings;
  onChange: (id: PresetId) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Timer preset" className="grid grid-cols-2 gap-2">
      {PRESET_ORDER.map((id) => {
        const checked = id === value;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(id)}
            className={`flex min-h-14 flex-col items-start rounded-2xl border-2 px-3 py-2 text-left focus-visible:outline-3 focus-visible:outline-sky-500 ${
              checked
                ? 'border-fox bg-peach/40 dark:bg-fox/20'
                : 'border-transparent bg-white dark:bg-night'
            }`}
          >
            <span className="font-extrabold">{PRESET_NAMES[id]}</span>
            <span className="tabular text-xs opacity-70">{presetSummary(id, settings)} min</span>
          </button>
        );
      })}
    </div>
  );
}

/** Preset chip above Start Focus; locked during a session. */
export function PresetPicker({ locked }: { locked: boolean }) {
  const settings = useAppStore((s) => s.settings);
  const [open, setOpen] = useState(false);
  const focus = timerLengths(settings).focusMin;

  return (
    <>
      <button
        type="button"
        disabled={locked}
        onClick={() => setOpen(true)}
        aria-label={`Timer preset: ${PRESET_NAMES[settings.presetId]}${locked ? ' (locked during a session)' : ''}`}
        className="flex min-h-11 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-bold shadow-[0_2px_0_rgba(59,42,36,0.08)] focus-visible:outline-3 focus-visible:outline-sky-500 disabled:opacity-60 dark:bg-dusk"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          aria-hidden="true"
        >
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2.5 2M9 2h6" strokeLinecap="round" />
        </svg>
        {PRESET_NAMES[settings.presetId]}
        <span className="opacity-60">· {fmt(focus)}m</span>
      </button>
      {open && (
        <Sheet title="Timer preset" onClose={() => setOpen(false)}>
          <PresetOptions
            value={settings.presetId}
            settings={settings}
            onChange={(presetId) => {
              useAppStore.getState().updateSettings({ presetId });
              setOpen(false);
            }}
          />
          <p className="mt-3 text-xs opacity-65">
            Focus / short break / long break. XP equals focus minutes, so longer sessions grow your
            fox faster. Edit Custom in Settings.
          </p>
        </Sheet>
      )}
    </>
  );
}
