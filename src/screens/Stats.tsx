import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ScreenHeader } from '../components/ScreenHeader';
import { ShareSheet } from '../components/ShareSheet';
import { Button, Card } from '../components/ui';
import { WeekBars } from '../components/WeekBars';
import { LabelBreakdown } from '../components/LabelBreakdown';
import { levelForXp, nextStageInfo, stageForXp, stageProgress } from '../logic/creature';
import { toDateKey } from '../logic/dates';
import { dailyFocus, formatDuration, totals } from '../logic/stats';
import { STAGE_LABEL } from '../lib/labels';
import { useAppStore } from '../store/useAppStore';

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="flex flex-col gap-0.5">
      <span className="text-xs font-bold tracking-wide uppercase opacity-60">{label}</span>
      <span className="tabular text-2xl font-extrabold">{value}</span>
      {sub && <span className="text-xs opacity-70">{sub}</span>}
    </Card>
  );
}

export function Stats({ onBack }: { onBack: () => void }) {
  const { creature, history, streak, labels } = useAppStore(
    useShallow((s) => ({
      creature: s.creature!,
      history: s.history,
      streak: s.streak,
      labels: s.labels,
    })),
  );
  const [sharing, setSharing] = useState(false);
  const t = totals(history);
  const days = dailyFocus(history, toDateKey(Date.now()), 7);
  const stage = stageForXp(creature.xp);
  const next = nextStageInfo(creature.xp);

  return (
    <div className="flex flex-1 flex-col gap-3 pb-3">
      <ScreenHeader title="Stats" onBack={onBack} />

      <div className="grid grid-cols-2 gap-3">
        <Tile label="Total focus" value={formatDuration(t.focusMinutes)} />
        <Tile label="Sessions" value={String(t.completed)} sub={`${t.abandoned} abandoned`} />
        <Tile
          label="Streak"
          value={`${streak.current} ${streak.current === 1 ? 'day' : 'days'}`}
          sub={`Best: ${streak.best}`}
        />
        <Tile label="XP" value={String(creature.xp)} sub={`Level ${levelForXp(creature.xp)}`} />
      </div>

      <Card>
        <div className="flex items-baseline justify-between">
          <span className="font-bold">{STAGE_LABEL[stage]}</span>
          <span className="text-sm opacity-75">
            {next ? `${next.xpNeeded} XP to ${STAGE_LABEL[next.stage]}` : 'Fully grown!'}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Growth to next stage"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(stageProgress(creature.xp) * 100)}
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10"
        >
          <div
            className="h-full rounded-full bg-fox"
            style={{ width: `${stageProgress(creature.xp) * 100}%` }}
          />
        </div>
      </Card>

      <Card>
        <WeekBars days={days} />
      </Card>

      <Card>
        <LabelBreakdown history={history} labels={labels} />
      </Card>

      <Button variant="secondary" onClick={() => setSharing(true)}>
        Share this week
      </Button>
      {sharing && <ShareSheet onClose={() => setSharing(false)} />}
    </div>
  );
}
