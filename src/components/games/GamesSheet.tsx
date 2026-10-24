import { GAMES } from '../../config';
import { bestText } from '../../logic/games';
import { useAppStore } from '../../store/useAppStore';
import type { GameId } from '../../types';
import { Sheet } from '../Sheet';

const ORDER: GameId[] = ['catch', 'memory'];

/** Pick a mini game; shows each game's best score. */
export function GamesSheet({
  onPick,
  onClose,
}: {
  onPick: (g: GameId) => void;
  onClose: () => void;
}) {
  const records = useAppStore((s) => s.games);
  const name = useAppStore((s) => s.creature?.name ?? 'your fox');
  return (
    <Sheet title={`Play with ${name}`} onClose={onClose}>
      <ul className="flex flex-col gap-2">
        {ORDER.map((id) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onPick(id)}
              data-autofocus={id === ORDER[0] || undefined}
              className="flex min-h-18 w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left focus-visible:outline-3 focus-visible:outline-sky-500 dark:bg-night"
            >
              <GameIcon game={id} />
              <span className="min-w-0 flex-1">
                <span className="block leading-tight font-extrabold">{GAMES[id].name}</span>
                <span className="block text-xs opacity-65">{GAMES[id].blurb(name)}</span>
                <span className="mt-0.5 block text-xs font-bold text-fox">
                  {bestText(id, records[id].best)}
                </span>
              </span>
              <span aria-hidden="true" className="text-2xl leading-none opacity-40">
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-center text-xs opacity-60">
        Just for fun: games never affect XP or happiness.
      </p>
    </Sheet>
  );
}

export function GameIcon({ game }: { game: GameId }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-peach/60 dark:bg-fox/25"
    >
      {game === 'catch' ? (
        <svg viewBox="0 0 40 40" className="h-8 w-8">
          <path d="M20 9 C30 9 34 18 31 26 C28 34 12 34 9 26 C6 18 10 9 20 9 Z" fill="#ff6b81" />
          <path d="M14 8 Q20 3 26 8 Q20 11 14 8 Z" fill="#5fbf7f" />
          <g fill="#ffe08a">
            <circle cx="15" cy="17" r="1.3" />
            <circle cx="23" cy="15" r="1.3" />
            <circle cx="26" cy="22" r="1.3" />
            <circle cx="18" cy="24" r="1.3" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 40 40" className="h-8 w-8">
          <rect
            x="6"
            y="9"
            width="13"
            height="18"
            rx="3"
            fill="#7b8af0"
            transform="rotate(-8 12 18)"
          />
          <rect
            x="20"
            y="11"
            width="13"
            height="18"
            rx="3"
            fill="#f08a4b"
            transform="rotate(8 26 20)"
          />
          <circle cx="26.5" cy="20" r="3" fill="#fff4e6" />
        </svg>
      )}
    </span>
  );
}
