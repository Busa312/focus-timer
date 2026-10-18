import { useState } from 'react';
import { LabelDot } from '../components/LabelPicker';
import { ScreenHeader } from '../components/ScreenHeader';
import { Button, Card } from '../components/ui';
import { LABEL_COLORS, LABEL_NAME_MAX, MAX_ACTIVE_LABELS } from '../config';
import { activeLabels, LABEL_ERROR_TEXT, suggestColor, type LabelError } from '../logic/labels';
import { useAppStore } from '../store/useAppStore';
import type { Label } from '../types';

function Swatches({
  value,
  onChange,
  name,
}: {
  value: string;
  onChange: (c: string) => void;
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={`${name} color`} className="flex flex-wrap gap-1.5">
      {LABEL_COLORS.map((c, i) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={c === value}
          aria-label={`Color ${i + 1}`}
          onClick={() => onChange(c)}
          className={`flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-3 focus-visible:outline-sky-500 ${
            c === value
              ? 'ring-3 ring-ink/70 ring-offset-2 ring-offset-white dark:ring-white/80 dark:ring-offset-dusk'
              : ''
          }`}
        >
          <span className="h-8 w-8 rounded-full" style={{ backgroundColor: c }} />
        </button>
      ))}
    </div>
  );
}

function LabelRow({ label }: { label: Label }) {
  const [name, setName] = useState(label.name);
  const [editingColor, setEditingColor] = useState(false);
  const [error, setError] = useState<LabelError | null>(null);
  const store = useAppStore.getState();

  const commitName = () => {
    if (name.trim() === label.name) return setName(label.name);
    const err = store.updateLabel(label.id, { name });
    setError(err);
    if (err) setName(label.name);
  };

  return (
    <li className="py-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Change color of ${label.name}`}
          aria-expanded={editingColor}
          onClick={() => setEditingColor((v) => !v)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-3 focus-visible:outline-sky-500"
        >
          <LabelDot color={label.color} className="h-6 w-6" />
        </button>
        <input
          aria-label={`Name of ${label.name}`}
          value={name}
          maxLength={LABEL_NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
          className="min-h-11 min-w-0 flex-1 rounded-xl bg-transparent px-2 font-bold outline-none focus-visible:ring-3 focus-visible:ring-sky-500"
        />
        <Button
          variant="ghost"
          className="px-3 text-sm"
          onClick={() => store.setLabelArchived(label.id, true)}
        >
          Archive
        </Button>
      </div>
      {editingColor && (
        <div className="mt-2 pl-12">
          <Swatches
            name={label.name}
            value={label.color}
            onChange={(color) => {
              store.updateLabel(label.id, { color });
              setEditingColor(false);
            }}
          />
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1 pl-12 text-sm text-rose-600 dark:text-rose-400">
          {LABEL_ERROR_TEXT[error]}
        </p>
      )}
    </li>
  );
}

export function Labels({ onBack }: { onBack: () => void }) {
  const labels = useAppStore((s) => s.labels);
  const active = activeLabels(labels);
  const archived = labels.filter((l) => l.archived);
  const [name, setName] = useState('');
  const [color, setColor] = useState(() => suggestColor(labels));
  const [error, setError] = useState<LabelError | null>(null);
  const full = active.length >= MAX_ACTIVE_LABELS;

  const add = () => {
    const err = useAppStore.getState().addLabel(name, color);
    setError(err);
    if (!err) {
      setName('');
      setColor(suggestColor(useAppStore.getState().labels));
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-3 pb-3">
      <ScreenHeader title="Labels" onBack={onBack} />

      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
          className="flex flex-col gap-3"
        >
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            New label
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={LABEL_NAME_MAX}
              placeholder="e.g. Study"
              disabled={full}
              className="min-h-11 rounded-2xl border-2 border-ink/10 bg-white px-4 text-base font-normal outline-none focus-visible:border-sky-500 dark:border-white/10 dark:bg-night"
            />
          </label>
          <Swatches name="New label" value={color} onChange={setColor} />
          <Button type="submit" disabled={full || !name.trim()}>
            Add label
          </Button>
          {(error || full) && (
            <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
              {LABEL_ERROR_TEXT[error ?? 'limit']}
            </p>
          )}
        </form>
      </Card>

      <Card>
        <h2 className="text-sm font-bold tracking-wide uppercase opacity-60">
          Your labels · {active.length} / {MAX_ACTIVE_LABELS}
        </h2>
        {active.length === 0 ? (
          <p className="py-3 text-sm opacity-70">No labels yet. Add one above.</p>
        ) : (
          <ul className="divide-y divide-ink/5 dark:divide-white/5">
            {active.map((l) => (
              <LabelRow key={l.id} label={l} />
            ))}
          </ul>
        )}
      </Card>

      {archived.length > 0 && (
        <Card>
          <h2 className="text-sm font-bold tracking-wide uppercase opacity-60">Archived</h2>
          <p className="text-xs opacity-65">
            Hidden from the picker; their time still shows in Stats.
          </p>
          <ul>
            {archived.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-1">
                <LabelDot color={l.color} className="ml-3 h-4 w-4" />
                <span className="flex-1 font-bold opacity-70">{l.name}</span>
                <Button
                  variant="ghost"
                  className="px-3 text-sm"
                  disabled={full}
                  onClick={() => setError(useAppStore.getState().setLabelArchived(l.id, false))}
                >
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
