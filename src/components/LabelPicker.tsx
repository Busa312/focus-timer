import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { activeLabels } from '../logic/labels';
import { useAppStore } from '../store/useAppStore';
import { Sheet } from './Sheet';
import { Button } from './ui';

export function LabelDot({
  color,
  className = 'h-3 w-3',
}: {
  color: string | null;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full ${color ? '' : 'border-2 border-dashed border-ink/30 dark:border-white/30'} ${className}`}
      style={color ? { backgroundColor: color } : undefined}
    />
  );
}

/** Label chip above Start Focus: optional, last used preselected, locked during a session. */
export function LabelPicker({ locked, onManage }: { locked: boolean; onManage: () => void }) {
  const { labels, selectedId } = useAppStore(
    useShallow((s) => ({ labels: s.labels, selectedId: s.settings.lastLabelId })),
  );
  const [open, setOpen] = useState(false);
  const active = activeLabels(labels);
  // The label shown while a session runs is the one it was started with.
  const sessionLabelId = useAppStore((s) => s.active?.labelId);
  const shownId = locked ? (sessionLabelId ?? null) : selectedId;
  const shown = labels.find((l) => l.id === shownId && (locked || !l.archived)) ?? null;

  const choose = (id: string | null) => {
    useAppStore.getState().selectLabel(id);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        disabled={locked}
        onClick={() => setOpen(true)}
        aria-label={`Label: ${shown?.name ?? 'No label'}${locked ? ' (locked during a session)' : ''}`}
        className="flex min-h-11 max-w-44 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-bold shadow-[0_2px_0_rgba(59,42,36,0.08)] focus-visible:outline-3 focus-visible:outline-sky-500 disabled:opacity-60 dark:bg-dusk"
      >
        <LabelDot color={shown?.color ?? null} />
        <span className="truncate">
          {shown?.name ?? (active.length ? 'No label' : 'Add label')}
        </span>
      </button>
      {open && (
        <Sheet title="What are you focusing on?" onClose={() => setOpen(false)}>
          <div role="radiogroup" aria-label="Label" className="flex flex-col gap-1.5">
            {[{ id: null, name: 'No label', color: null }, ...active].map((l) => {
              const checked = (shown?.id ?? null) === l.id;
              return (
                <button
                  key={l.id ?? 'none'}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => choose(l.id)}
                  className={`flex min-h-12 items-center gap-3 rounded-2xl border-2 px-4 text-left font-bold focus-visible:outline-3 focus-visible:outline-sky-500 ${
                    checked
                      ? 'border-fox bg-peach/40 dark:bg-fox/20'
                      : 'border-transparent bg-white dark:bg-night'
                  }`}
                >
                  <LabelDot color={l.color} className="h-4 w-4" />
                  {l.name}
                </button>
              );
            })}
          </div>
          {active.length === 0 && (
            <p className="mt-3 text-sm opacity-70">
              Labels show where your focus time goes, like “Study” or “Work”.
            </p>
          )}
          <Button
            variant="secondary"
            className="mt-4 w-full"
            onClick={() => {
              setOpen(false);
              onManage();
            }}
          >
            {active.length ? 'Manage labels' : 'Create a label'}
          </Button>
        </Sheet>
      )}
    </>
  );
}
