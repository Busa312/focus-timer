import { useCallback, useEffect, useReducer, useRef, useState, type PointerEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  CATCH,
  isOver,
  moveFoxTo,
  newCatchGame,
  step,
  timeLeftMs,
  type CatchEvent,
} from '../../logic/catchGame';
import { stageForXp } from '../../logic/creature';
import { useAppStore } from '../../store/useAppStore';
import type { CreatureState } from '../../types';
import { Creature } from '../Creature/Creature';
import { Button } from '../ui';
import { TreatIcon } from './icons';
import { useGameSound } from './useGameSound';
import { unlockAudio } from '../../lib/sound';
import type { GameProps } from './GameScreen';

type Phase = 'ready' | 'playing' | 'over';

const POPUP_MS = 700;
const REACTION_MS = 700;

/** Runs `onFrame(dtMs)` every animation frame while `running`. */
function useAnimationFrame(running: boolean, onFrame: (dtMs: number) => void) {
  const cb = useRef(onFrame);
  cb.current = onFrame;
  useEffect(() => {
    if (!running) return;
    let id = 0;
    let last: number | null = null;
    const raf =
      window.requestAnimationFrame?.bind(window) ??
      ((f: FrameRequestCallback) => window.setTimeout(() => f(performance.now()), 16));
    const cancel = window.cancelAnimationFrame?.bind(window) ?? window.clearTimeout;
    const loop = (t: number) => {
      // The first frame after a pause (e.g. app in background) counts as one short frame.
      const dt = last === null ? 16 : t - last;
      last = t;
      cb.current(dt);
      id = raf(loop);
    };
    id = raf(loop);
    return () => cancel(id);
  }, [running]);
}

const formatSeconds = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function CatchGame({ best, onFinish }: GameProps) {
  const { name, xp, color, accessory } = useAppStore(
    useShallow((s) => ({
      name: s.creature?.name ?? 'your fox',
      xp: s.creature?.xp ?? 0,
      color: s.wardrobe.color,
      accessory: s.wardrobe.equipped,
    })),
  );
  const stage = stageForXp(xp);
  const [phase, setPhase] = useState<Phase>('ready');
  const game = useRef(newCatchGame());
  const [, render] = useReducer((n: number) => n + 1, 0);
  const [result, setResult] = useState<{ score: number; isNewBest: boolean } | null>(null);
  const [popups, setPopups] = useState<(CatchEvent & { until: number })[]>([]);
  const [reaction, setReaction] = useState<{ state: CreatureState; until: number } | null>(null);
  const keys = useRef(new Set<string>());
  const area = useRef<HTMLDivElement>(null);
  const sound = useGameSound();
  const actionBtn = useRef<HTMLButtonElement>(null);

  // Start / Play again is focused, so Enter or Space starts a round.
  useEffect(() => {
    if (phase !== 'playing') actionBtn.current?.focus();
  }, [phase]);

  const start = useCallback(() => {
    unlockAudio(); // Browsers only allow sound after a tap.
    game.current = newCatchGame();
    keys.current.clear();
    setPopups([]);
    setReaction(null);
    setResult(null);
    setPhase('playing');
  }, []);

  useAnimationFrame(phase === 'playing', (dt) => {
    const walk = (keys.current.has('right') ? 1 : 0) - (keys.current.has('left') ? 1 : 0);
    const next = step(game.current, dt, Math.random, walk);
    game.current = next;
    const now = performance.now();
    if (next.events.length) {
      setPopups((p) => [
        ...p.filter((x) => x.until > now),
        ...next.events.map((e) => ({ ...e, until: now + POPUP_MS })),
      ]);
      for (const ev of next.events) sound(ev.kind);
      const e = next.events[next.events.length - 1];
      if (e.kind !== 'berry') {
        setReaction({
          state: e.kind === 'golden' ? 'celebrating' : 'disappointed',
          until: now + REACTION_MS,
        });
      }
    }
    if (isOver(next)) {
      sound('win');
      setPhase('over');
      setResult({ score: next.score, isNewBest: onFinish(next.score) });
    }
    render();
  });

  // Keyboard: arrows or A / D to walk; Enter or Space to start.
  useEffect(() => {
    const dir = (k: string) =>
      k === 'ArrowLeft' || k === 'a' || k === 'A'
        ? 'left'
        : k === 'ArrowRight' || k === 'd' || k === 'D'
          ? 'right'
          : null;
    const down = (e: KeyboardEvent) => {
      const d = dir(e.key);
      if (d && phase === 'playing') {
        keys.current.add(d);
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      const d = dir(e.key);
      if (d) keys.current.delete(d);
    };
    // A key held while switching windows never sends keyup; let go of everything.
    const release = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', release);
    };
  }, [phase]);

  const follow = (e: PointerEvent<HTMLDivElement>) => {
    if (phase !== 'playing' || !area.current) return;
    const r = area.current.getBoundingClientRect();
    if (r.width <= 0) return;
    game.current = moveFoxTo(game.current, (e.clientX - r.left) / r.width);
  };

  const g = game.current;
  const now = performance.now();
  const foxState: CreatureState = reaction && reaction.until > now ? reaction.state : 'idle';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-end justify-between px-1" aria-live="off">
        <div>
          <p className="text-xs font-bold tracking-wide uppercase opacity-60">Score</p>
          <p className="tabular text-3xl leading-none font-extrabold" data-testid="catch-score">
            {g.score}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold tracking-wide uppercase opacity-60">Time</p>
          <p className="tabular text-3xl leading-none font-extrabold" data-testid="catch-time">
            {formatSeconds(timeLeftMs(g))}
          </p>
        </div>
      </div>

      <div
        ref={area}
        data-testid="catch-area"
        onPointerDown={(e) => {
          // Only grab the pointer mid-round: capturing it while the Start / Play again
          // overlay is up would send the button's click to the play area instead.
          if (phase !== 'playing') return;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          follow(e);
        }}
        onPointerMove={follow}
        className="relative min-h-0 flex-1 touch-none overflow-hidden rounded-3xl bg-gradient-to-b from-sky-100 via-[#fdf6ee] to-[#e9f5df] select-none dark:from-[#2b2540] dark:via-[#231e2b] dark:to-[#1f2a24]"
      >
        {/* Ground */}
        <div className="absolute inset-x-0 bottom-0 h-[9%] bg-[#cfe8bf] dark:bg-[#2c3b2f]" />

        {g.items.map((item) => (
          <div
            key={item.id}
            className="absolute aspect-square"
            style={{
              left: `${item.x * 100}%`,
              top: `${item.y * 100}%`,
              width: `${CATCH.itemRadius * 2 * 100 * 1.6}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <TreatIcon kind={item.kind} className="h-full w-full" />
          </div>
        ))}

        {popups
          .filter((p) => p.until > now)
          .map((p) => (
            <span
              key={p.id}
              className={`catch-popup absolute text-lg font-extrabold ${
                p.points > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              } ${p.kind === 'golden' ? 'text-2xl text-amber-500!' : ''}`}
              style={{ left: `${p.x * 100}%`, top: `${(CATCH.catchY - 0.08) * 100}%` }}
            >
              {p.points > 0 ? `+${p.points}` : `−${-p.points}`}
            </span>
          ))}

        {/* The fox: its head lines up with the catch line. */}
        <div
          className="pointer-events-none absolute aspect-square"
          style={{
            left: `${g.foxX * 100}%`,
            top: `${CATCH.catchY * 100}%`,
            // The fox drawing fills about half its box, so a 2x box matches the catch reach.
            width: `${CATCH.foxHalfWidth * 2 * 100 * 2}%`,
            transform: 'translate(-50%, -42%)',
          }}
          data-testid="catch-fox"
        >
          <Creature
            stage={stage === 'egg' ? 'baby' : stage}
            mood="happy"
            state={foxState}
            color={color}
            accessory={accessory}
            renderer="svg"
            className="h-full w-full"
          />
        </div>

        {phase !== 'playing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-cream/75 p-6 backdrop-blur-[2px] dark:bg-night/75">
            {phase === 'ready' ? (
              <div className="animate-pop flex max-w-xs flex-col items-center gap-3 text-center">
                <p className="text-2xl font-extrabold">Catch the treats</p>
                <p className="text-sm opacity-80">
                  Drag anywhere to move {name}. You have 60 seconds.
                </p>
                <ul className="flex flex-col gap-1.5 text-sm font-bold">
                  <li className="flex items-center gap-2">
                    <TreatIcon kind="berry" className="h-7 w-7" /> Berry +1
                  </li>
                  <li className="flex items-center gap-2">
                    <TreatIcon kind="golden" className="h-7 w-7" /> Golden berry +5
                  </li>
                  <li className="flex items-center gap-2">
                    <TreatIcon kind="pinecone" className="h-7 w-7" /> Pinecone −3
                  </li>
                </ul>
                <Button ref={actionBtn} data-autofocus className="mt-1 min-w-40" onClick={start}>
                  Start
                </Button>
              </div>
            ) : (
              <div
                className="animate-pop flex max-w-xs flex-col items-center gap-2 text-center"
                role="status"
              >
                <p className="text-sm font-bold tracking-wide uppercase opacity-60">Time’s up!</p>
                <p
                  className="tabular text-6xl leading-none font-extrabold"
                  data-testid="catch-final"
                >
                  {result?.score ?? g.score}
                </p>
                <p className="text-sm opacity-75">points</p>
                {result?.isNewBest ? (
                  <p className="rounded-full bg-amber-100 px-3 py-1 text-sm font-extrabold text-amber-900 dark:bg-amber-900 dark:text-amber-50">
                    New best!
                  </p>
                ) : (
                  best !== null && <p className="text-sm font-bold opacity-70">Best: {best}</p>
                )}
                <p className="text-xs opacity-65">
                  {g.caught.berry} berries · {g.caught.golden} golden · {g.caught.pinecone}{' '}
                  pinecones
                </p>
                <Button ref={actionBtn} data-autofocus className="mt-2 min-w-40" onClick={start}>
                  Play again
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="text-center text-xs opacity-55">Arrow keys or A / D work too.</p>
    </div>
  );
}
