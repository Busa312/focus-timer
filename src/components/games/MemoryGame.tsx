import { useEffect, useReducer, useRef, useState } from 'react';
import {
  elapsedMs,
  flip,
  hideMismatch,
  isComplete,
  isMismatchShowing,
  matchedPairs,
  MEMORY_FACES,
  newMemoryGame,
  type MemoryFace,
} from '../../logic/memoryGame';
import { Button } from '../ui';
import type { GameProps } from './GameScreen';
import { MemoryFaceIcon } from './icons';
import { useGameSound } from './useGameSound';
import { unlockAudio } from '../../lib/sound';

/** How long a mismatch stays face up (tapping another card hides it sooner). */
const MISMATCH_MS = 900;

const FACE_NAMES: Record<MemoryFace, string> = {
  glasses: 'glasses',
  headphones: 'headphones',
  beanie: 'beanie',
  flowerCrown: 'flower crown',
  bowTie: 'bow tie',
  starCape: 'star cape',
  berry: 'berry',
  golden: 'golden berry',
};

const formatTime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function CardBack() {
  return (
    <svg viewBox="0 0 40 40" className="h-1/2 w-1/2" aria-hidden="true">
      <g fill="#fff4e6" opacity="0.9">
        <ellipse cx="20" cy="25" rx="8" ry="6.5" />
        <circle cx="11" cy="16" r="3.4" />
        <circle cx="17" cy="11" r="3.4" />
        <circle cx="23" cy="11" r="3.4" />
        <circle cx="29" cy="16" r="3.4" />
      </g>
    </svg>
  );
}

export function MemoryGame({ best, onFinish }: GameProps) {
  const [game, setGame] = useState(() => newMemoryGame(Math.random));
  const [result, setResult] = useState<{ moves: number; ms: number; isNewBest: boolean } | null>(
    null,
  );
  const [shake, setShake] = useState<number[]>([]);
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const againBtn = useRef<HTMLButtonElement>(null);
  const sound = useGameSound();
  // Spoken feedback for screen readers: pair found / no match / done.
  const [announce, setAnnounce] = useState('');

  // Clock: redraw once a second while a game is under way.
  const running = game.startedAt !== null && game.finishedAt === null;
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // Turn a mismatch back over after a moment.
  const mismatch = isMismatchShowing(game) ? game.flipped.join() : null;
  useEffect(() => {
    if (!mismatch) return;
    const id = window.setTimeout(() => setGame((g) => hideMismatch(g)), MISMATCH_MS);
    return () => window.clearTimeout(id);
  }, [mismatch]);

  useEffect(() => {
    if (result) againBtn.current?.focus();
  }, [result]);

  const onCard = (i: number) => {
    const now = Date.now();
    const next = flip(game, i, now);
    if (next === game) return;
    unlockAudio(); // Browsers only allow sound after a tap.
    setGame(next);
    const pairFound = matchedPairs(next) > matchedPairs(game);
    if (isMismatchShowing(next)) {
      setShake(next.flipped);
      setAnnounce('No match');
    } else if (pairFound) {
      setAnnounce(`Pair found: ${FACE_NAMES[next.cards[i].face]}`);
    }
    if (isComplete(next)) {
      sound('win');
      setAnnounce(`All pairs found in ${next.moves} moves`);
      setResult({ moves: next.moves, ms: elapsedMs(next, now), isNewBest: onFinish(next.moves) });
    } else {
      sound(pairFound ? 'match' : 'flip');
    }
  };

  const restart = () => {
    setAnnounce('');
    setGame(newMemoryGame(Math.random));
    setResult(null);
    setShake([]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-end justify-between px-1">
        <div>
          <p className="text-xs font-bold tracking-wide uppercase opacity-60">Moves</p>
          <p className="tabular text-3xl leading-none font-extrabold" data-testid="memory-moves">
            {game.moves}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs font-bold tracking-wide uppercase opacity-60">Pairs</p>
          <p className="tabular text-3xl leading-none font-extrabold" data-testid="memory-pairs">
            {matchedPairs(game)}/{MEMORY_FACES.length}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold tracking-wide uppercase opacity-60">Time</p>
          <p className="tabular text-3xl leading-none font-extrabold" data-testid="memory-time">
            {formatTime(elapsedMs(game, Date.now()))}
          </p>
        </div>
      </div>

      {/* The board is as large as fits: the smaller of the available width and height. */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center [container-type:size]">
        <div
          className="grid aspect-square w-[min(100cqw,100cqh)] grid-cols-4 gap-2"
          data-testid="memory-board"
        >
          {game.cards.map((card, i) => {
            const up = card.matched || game.flipped.includes(i);
            const label = card.matched
              ? `${FACE_NAMES[card.face]}, matched`
              : up
                ? FACE_NAMES[card.face]
                : `Card ${i + 1}, hidden`;
            return (
              <button
                key={i}
                type="button"
                aria-label={label}
                aria-disabled={card.matched || undefined}
                onClick={() => onCard(i)}
                onAnimationEnd={() => setShake([])}
                className={`memory-card rounded-2xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                  shake.includes(i) && isMismatchShowing(game) ? 'memory-shake' : ''
                }`}
              >
                <span className={`memory-card-inner ${up ? 'is-up' : ''}`}>
                  <span className="memory-face memory-back bg-fox shadow-[0_3px_0_#d0703a]">
                    <CardBack />
                  </span>
                  <span
                    className={`memory-face memory-front border border-ink/10 bg-white shadow-[0_3px_0_rgba(59,42,36,0.12)] ${
                      card.matched ? 'ring-3 ring-emerald-400 ring-inset' : ''
                    }`}
                  >
                    <MemoryFaceIcon face={card.face} className="h-3/5 w-3/5" />
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {result && (
          <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-cream/80 p-6 backdrop-blur-[2px] dark:bg-night/80">
            <div
              className="animate-pop flex max-w-xs flex-col items-center gap-2 text-center"
              role="status"
            >
              <p className="text-sm font-bold tracking-wide uppercase opacity-60">
                All pairs found!
              </p>
              <p
                className="tabular text-6xl leading-none font-extrabold"
                data-testid="memory-final"
              >
                {result.moves}
              </p>
              <p className="text-sm opacity-75">moves · {formatTime(result.ms)}</p>
              {result.isNewBest ? (
                <p className="rounded-full bg-amber-100 px-3 py-1 text-sm font-extrabold text-amber-900 dark:bg-amber-900 dark:text-amber-50">
                  New best!
                </p>
              ) : (
                best !== null && <p className="text-sm font-bold opacity-70">Best: {best} moves</p>
              )}
              <Button ref={againBtn} className="mt-2 min-w-40" onClick={restart}>
                Play again
              </Button>
            </div>
          </div>
        )}
      </div>
      <p className="text-center text-xs opacity-55">Find all 8 pairs in as few moves as you can.</p>
      <p className="sr-only" aria-live="polite" data-testid="memory-announce">
        {announce}
      </p>
    </div>
  );
}
