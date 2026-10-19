import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { GAMES } from '../../config';
import { formatClock, remainingMs } from '../../logic/timer';
import { useAppStore } from '../../store/useAppStore';
import type { GameId } from '../../types';
import { bestText } from '../../logic/games';
import { GameIcon } from './GamesSheet';

/** What every game gets from the shell. */
export interface GameProps {
  best: number | null;
  /** Report a finished game; returns true for a new high score. */
  onFinish: (score: number) => boolean;
}

const HISTORY_KEY = 'focusFoxGame';

/**
 * Close by stepping back over the history entry the game added, so the back
 * gesture and the X behave the same. Never steps back out of the app.
 */
function close() {
  if (history.state?.[HISTORY_KEY]) history.back();
  else window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * Full-screen game view, available whenever no focus session is running.
 * The phone's back gesture closes the game instead of leaving the app.
 */
export function GameScreen({
  game,
  now,
  onClose,
  children,
}: {
  game: GameId;
  now: number;
  onClose: () => void;
  children: (props: GameProps) => ReactNode;
}) {
  const { best, active } = useAppStore(
    useShallow((s) => ({ best: s.games[game].best, active: s.active })),
  );
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [closeBtn, setCloseBtn] = useState<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (history.state?.[HISTORY_KEY] !== game) history.pushState({ [HISTORY_KEY]: game }, '');
    const onPop = () => closeRef.current();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
    };
  }, [game]);

  // Focus the game's own default control (e.g. Start), or else the close button.
  useEffect(() => {
    if (!closeBtn) return;
    const dialog = closeBtn.closest('[role="dialog"]');
    (dialog?.querySelector<HTMLElement>('[data-autofocus]') ?? closeBtn).focus();
  }, [closeBtn]);

  const onBreak = active !== null && active.phase !== 'focus';
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={GAMES[game].name}
      className="safe-area fixed inset-0 z-50 flex flex-col bg-cream dark:bg-night"
    >
      <header className="mx-auto flex w-full max-w-120 items-center gap-3 pb-3">
        <button
          ref={setCloseBtn}
          type="button"
          aria-label="Close game"
          onClick={close}
          className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-ink/5 focus-visible:outline-3 focus-visible:outline-sky-500 dark:hover:bg-white/10"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <GameIcon game={game} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg leading-tight font-extrabold">{GAMES[game].name}</h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold">
            <span className="text-fox" data-testid="game-best">
              {bestText(game, best)}
            </span>
            {onBreak && (
              <span
                className="tabular rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-50"
                data-testid="game-break"
              >
                Break {formatClock(remainingMs(active, Math.max(now, active.startedAt)))}
              </span>
            )}
          </p>
        </div>
      </header>
      <main className="mx-auto flex min-h-0 w-full max-w-120 flex-1 flex-col">
        {children({
          best,
          onFinish: (score) => useAppStore.getState().recordGameScore(game, score),
        })}
      </main>
    </div>
  );
}
