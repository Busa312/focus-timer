import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CELEBRATION_MS, TRANSIENT_STATE_MS } from '../config';
import type { GameEvent } from '../logic/engine';
import { playChime } from '../lib/sound';
import { useAppStore } from '../store/useAppStore';
import { unseenUnlocks } from '../logic/unlocks';
import { EvolutionMoment } from './EvolutionMoment';
import { UnlockMoment } from './UnlockMoment';

type Completed = Extract<GameEvent, { type: 'completed' }>;

/** The post-session sequence is over: start the break if auto-start is on. */
function finishCelebration() {
  const s = useAppStore.getState();
  s.dismissEvent();
  if (s.settings.autoStartBreaks && s.pendingBreak && !s.active) s.startBreak();
}

/**
 * Reacts to game events: chime, celebration card with +XP / +happiness for 3 s,
 * the evolution moment on a stage-up, then the break. Disappointed and relief
 * states clear on their own after a few seconds.
 */
export function EventLayer() {
  const { event, soundOn, name, wardrobe, focusing } = useAppStore(
    useShallow((s) => ({
      event: s.event,
      soundOn: s.settings.soundOn,
      name: s.creature?.name ?? 'Your fox',
      wardrobe: s.wardrobe,
      focusing: s.active?.phase === 'focus',
    })),
  );
  const [evolving, setEvolving] = useState<Completed | null>(null);

  useEffect(() => {
    if (!event) return;
    if ((event.type === 'completed' || event.type === 'breakEnded') && soundOn) playChime();
    if (event.type === 'completed') {
      const id = window.setTimeout(() => {
        if (event.stagedUp) setEvolving(event);
        else finishCelebration();
      }, CELEBRATION_MS);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => useAppStore.getState().dismissEvent(), TRANSIENT_STATE_MS);
    return () => window.clearTimeout(id);
    // Only re-run for a new event object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  if (evolving) {
    return (
      <EvolutionMoment
        name={name}
        fromStage={evolving.fromStage}
        toStage={evolving.toStage}
        color={wardrobe.color}
        onDone={() => {
          setEvolving(null);
          finishCelebration();
        }}
      />
    );
  }
  if (event?.type === 'abandoned') {
    return <Toast>{abandonMessage(event.reason)}</Toast>;
  }
  if (event?.type !== 'completed') {
    // Unlocks wait until the session's own moments are over, and never interrupt focus.
    const next = !event && !focusing ? unseenUnlocks(wardrobe)[0] : undefined;
    return next ? <UnlockMoment key={next.uid} item={next} /> : null;
  }
  return (
    <CelebrationCard
      event={event}
      onSkip={() => (event.stagedUp ? setEvolving(event) : finishCelebration())}
    />
  );
}

function abandonMessage(reason: Extract<GameEvent, { type: 'abandoned' }>['reason']): string {
  switch (reason) {
    case 'gaveUp':
      return "That's okay. Try again when you're ready.";
    case 'leftApp':
      return 'You left for a while, so the session ended. Your fox misses you.';
    case 'appClosed':
      return 'The app closed mid-session, so it ended. Start a new one any time.';
  }
}

function Toast({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="animate-pop fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-40 mx-auto max-w-sm rounded-2xl bg-sky-100 px-4 py-3 text-center text-sm font-bold text-sky-900 shadow-lg dark:bg-sky-900 dark:text-sky-50"
    >
      {children}
    </div>
  );
}

function Treat() {
  return (
    <svg viewBox="0 0 40 40" className="animate-pop mx-auto mt-3 h-12 w-12" aria-hidden="true">
      <path d="M20 9 C30 9 34 18 31 26 C28 34 12 34 9 26 C6 18 10 9 20 9 Z" fill="#ff6b81" />
      <path d="M14 8 Q20 3 26 8 Q20 11 14 8 Z" fill="#5fbf7f" />
      <g fill="#ffe08a">
        <circle cx="15" cy="17" r="1.2" />
        <circle cx="23" cy="15" r="1.2" />
        <circle cx="26" cy="22" r="1.2" />
        <circle cx="18" cy="24" r="1.2" />
        <circle cx="13" cy="23" r="1.2" />
      </g>
    </svg>
  );
}

function CelebrationCard({ event, onSkip }: { event: Completed; onSkip: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center p-4 pb-28" onClick={onSkip}>
      <div
        role="status"
        className="animate-pop w-full max-w-sm rounded-3xl bg-white px-6 py-5 text-center shadow-xl dark:bg-dusk"
      >
        <p className="text-2xl font-extrabold">Session complete!</p>
        <div className="mt-2 flex justify-center gap-5 text-lg font-extrabold">
          <span className="text-fox">+{event.xpGained} XP</span>
          <span className="text-rose-500">+{event.happinessGained} ♥</span>
        </div>
        {event.longBreakEarned && (
          <>
            <Treat />
            <p className="text-sm font-bold">Long break earned. Treat time!</p>
          </>
        )}
      </div>
    </div>
  );
}
