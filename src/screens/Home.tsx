import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Creature } from '../components/Creature/Creature';
import { HappinessBar } from '../components/HappinessBar';
import { ThemeButton } from '../components/ThemeButton';
import { LabelPicker } from '../components/LabelPicker';
import { PresetPicker } from '../components/PresetPicker';
import { TimerRing } from '../components/TimerRing';
import { Button, ConfirmDialog } from '../components/ui';
import { levelForXp, moodForHappiness, stageForXp } from '../logic/creature';
import {
  elapsedFraction,
  formatClock,
  phaseDurationMs,
  remainingMs,
  sessionDurationMs,
} from '../logic/timer';
import { PHASE_LABEL, PHASE_TONE, STAGE_LABEL } from '../lib/labels';
import { unlockAudio } from '../lib/sound';
import { markTipSeen, tipSeen } from '../lib/tips';
import { useInstallOption } from '../lib/install';
import { ShareIcon } from '../components/ShareIcon';
import { wakeLockSupported } from '../hooks/useWakeLock';
import { useAppStore } from '../store/useAppStore';
import type { CreatureState } from '../types';
import { creatureStateFor } from './creatureState';

export function Home({ now, onManageLabels }: { now: number; onManageLabels: () => void }) {
  const { creature, active, pendingBreak, cycleCount, settings, event, wardrobe } = useAppStore(
    useShallow((s) => ({
      creature: s.creature!,
      active: s.active,
      pendingBreak: s.pendingBreak,
      cycleCount: s.cycleCount,
      settings: s.settings,
      event: s.event,
      wardrobe: s.wardrobe,
    })),
  );
  const store = useAppStore.getState();
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  const [showScreenTip, setShowScreenTip] = useState(false);
  const install = useInstallOption();
  const [iosTipDismissed, setIosTipDismissed] = useState(() => tipSeen('ios-install'));

  const celebrating = event?.type === 'completed';
  // Keep the old form on screen until the evolution moment reveals the new one.
  const stage = celebrating && event.stagedUp ? event.fromStage : stageForXp(creature.xp);
  const mood = moodForHappiness(creature.happiness);
  const state: CreatureState = creatureStateFor(active, event);

  // What the ring and clock show.
  let phase = active?.phase ?? pendingBreak ?? 'focus';
  let clockMs: number;
  let progress: number;
  if (active) {
    const t = Math.max(now, active.startedAt);
    clockMs = Math.min(remainingMs(active, t), sessionDurationMs(active));
    const elapsed = elapsedFraction(active, t);
    // Drains during focus, fills during breaks.
    progress = active.phase === 'focus' ? 1 - elapsed : elapsed;
  } else {
    phase = pendingBreak ?? 'focus';
    clockMs = phaseDurationMs(phase, settings);
    progress = pendingBreak ? 0 : 1;
  }
  const tone = PHASE_TONE[phase];
  const longClock = clockMs >= 3_600_000;
  const paused = active?.pausedAt != null;

  // Session dots: completed focus sessions in the current cycle.
  const total = settings.sessionsPerLongBreak;
  const longBreakNow = active?.phase === 'longBreak' || pendingBreak === 'longBreak';
  const filled = longBreakNow ? total : cycleCount;

  const level = levelForXp(creature.xp);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-start justify-between px-1 pt-2">
        <div>
          <h1 className="text-xl font-extrabold leading-tight">{creature.name}</h1>
          <p className="text-sm opacity-70">
            {STAGE_LABEL[stage]}
            {stage === 'adult' && level > 0 ? ` · Lv ${level}` : ''}
          </p>
        </div>
        <div className="-mr-2 flex items-center gap-1">
          <HappinessBar value={creature.happiness} />
          <ThemeButton />
        </div>
      </header>

      <div className="flex min-h-[200px] flex-[1.4] items-center justify-center">
        <Creature
          stage={stage}
          mood={mood}
          state={state}
          name={creature.name}
          color={wardrobe.color}
          accessory={wardrobe.equipped}
          speech
          say={event?.type === 'relief' ? "Phew, you're back!" : null}
          className="aspect-square h-full max-h-64 w-full max-w-64 pt-8"
        />
      </div>

      <div className="flex flex-col items-center gap-3 pb-2">
        <TimerRing progress={progress} tone={tone.stroke}>
          <span
            // "1:30:00" is two characters wider than "25:00"; shrink it to stay inside the ring.
            className={`tabular leading-none font-extrabold tracking-tight ${
              longClock ? 'text-4xl' : 'text-5xl'
            }`}
            data-testid="clock"
            aria-live="off"
          >
            {formatClock(clockMs)}
          </span>
          {/* Hangs below the centered time so the time itself sits in the middle. */}
          <span
            className={`absolute text-sm font-bold ${tone.text} ${
              longClock ? 'top-[calc(50%+1.5rem)]' : 'top-[calc(50%+1.75rem)]'
            }`}
            data-testid="phase"
          >
            {paused
              ? 'Paused'
              : active
                ? PHASE_LABEL[phase]
                : pendingBreak
                  ? 'Break ready'
                  : 'Ready'}
          </span>
        </TimerRing>

        <div
          className="flex items-center gap-2"
          aria-label={`${filled} of ${total} sessions this cycle`}
          data-testid="dots"
        >
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${i < filled ? 'bg-fox' : 'bg-ink/15 dark:bg-white/15'}`}
            />
          ))}
          <span className="ml-1 text-xs opacity-60">
            {filled} of {total}
          </span>
        </div>

        <div className="flex items-center justify-center gap-2" data-testid="chips">
          <LabelPicker locked={active?.phase === 'focus'} onManage={onManageLabels} />
          <PresetPicker locked={active !== null || pendingBreak !== null || celebrating} />
        </div>

        <div className="flex w-full flex-wrap items-center justify-center gap-3 pt-1">
          {!active && !pendingBreak && !celebrating && (
            <Button
              className="min-w-48 text-lg"
              onClick={() => {
                unlockAudio();
                store.startFocus();
                if (!wakeLockSupported() && !tipSeen('wakelock')) setShowScreenTip(true);
              }}
            >
              Start Focus
            </Button>
          )}

          {!active && pendingBreak && !celebrating && (
            <>
              <Button onClick={() => store.startBreak()}>Start break</Button>
              <Button variant="secondary" onClick={() => store.skipBreak()}>
                Skip break
              </Button>
            </>
          )}

          {active?.phase === 'focus' && (
            <>
              {paused ? (
                <Button onClick={() => store.resume()}>Resume</Button>
              ) : (
                <Button variant="secondary" onClick={() => store.pause()}>
                  Pause
                </Button>
              )}
              <Button variant="ghost" onClick={() => setConfirmGiveUp(true)}>
                Give up
              </Button>
            </>
          )}

          {active && active.phase !== 'focus' && (
            <Button variant="secondary" onClick={() => store.skipBreak()}>
              Skip break
            </Button>
          )}
        </div>
      </div>

      {install === 'ios' && !iosTipDismissed && !active && (
        <div
          role="note"
          className="fixed inset-x-4 top-[max(0.75rem,env(safe-area-inset-top))] z-30 mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-sky-100 px-4 py-2 text-sm text-sky-950 shadow-lg"
        >
          <span className="flex-1">
            Install: tap <ShareIcon /> Share, then <strong>Add to Home Screen</strong>.
          </span>
          <Button
            variant="ghost"
            className="px-3! text-sky-950!"
            onClick={() => {
              markTipSeen('ios-install');
              setIosTipDismissed(true);
            }}
          >
            OK
          </Button>
        </div>
      )}

      {showScreenTip && active?.phase === 'focus' && (
        <div
          role="note"
          className="fixed inset-x-4 bottom-24 z-30 mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-butter px-4 py-3 text-sm text-ink shadow-lg"
        >
          <span className="flex-1">Keep this screen open while you focus.</span>
          <Button
            variant="ghost"
            className="px-3! text-ink!"
            onClick={() => {
              markTipSeen('wakelock');
              setShowScreenTip(false);
            }}
          >
            Got it
          </Button>
        </div>
      )}

      {confirmGiveUp && (
        <ConfirmDialog
          title={`Give up? ${creature.name} will be sad`}
          body="This session won't count, but your fox keeps all its XP."
          confirmLabel="Give up"
          cancelLabel="Keep going"
          onCancel={() => setConfirmGiveUp(false)}
          onConfirm={() => {
            setConfirmGiveUp(false);
            store.giveUp();
          }}
        />
      )}
    </div>
  );
}
