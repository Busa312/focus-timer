import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Creature } from '../components/Creature/Creature';
import { FOX_PALETTES } from '../components/Creature/palette';
import { ScreenHeader } from '../components/ScreenHeader';
import { Button, Card, SectionTitle } from '../components/ui';
import { ACCESSORY_NAMES, COLOR_NAMES, UNLOCKS, type UnlockItem } from '../config';
import { moodForHappiness, stageForXp } from '../logic/creature';
import { isUnlocked, progressOf, ruleProgress, ruleText } from '../logic/unlocks';
import { useAppStore } from '../store/useAppStore';
import type { Accessory, FoxColor } from '../types';

const COLORS: FoxColor[] = ['red', 'arctic', 'silver', 'midnight'];
const ACCESSORIES: Accessory[] = [
  'none',
  'glasses',
  'headphones',
  'beanie',
  'flowerCrown',
  'bowTie',
  'starCape',
];

/** Short names that fit the 4-across color tiles. */
const COLOR_TILE_NAMES: Record<FoxColor, string> = {
  red: 'Red',
  arctic: 'Arctic',
  silver: 'Silver',
  midnight: 'Midnight',
};

function LockBadge({ small = false }: { small?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute flex items-center justify-center rounded-full bg-ink/75 text-white dark:bg-white/85 dark:text-ink ${
        small ? 'top-1 right-1 h-5 w-5' : 'top-1.5 right-1.5 h-6 w-6'
      }`}
    >
      <svg viewBox="0 0 24 24" className={small ? 'h-3 w-3' : 'h-3.5 w-3.5'} fill="currentColor">
        <path d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V8a3 3 0 0 0-6 0z" />
      </svg>
    </span>
  );
}

/** Tile look: equipped (solid), previewing (dashed), or plain. */
function tileClass(equipped: boolean, previewing: boolean) {
  const base =
    'relative flex flex-col items-center justify-start rounded-2xl border-2 text-center focus-visible:outline-3 focus-visible:outline-sky-500';
  if (equipped) return `${base} border-fox bg-peach/40 dark:bg-fox/20`;
  if (previewing) return `${base} border-dashed border-sky-500 bg-sky-50 dark:bg-sky-950/40`;
  return `${base} border-transparent bg-cream dark:bg-night`;
}

interface Preview {
  color?: FoxColor;
  accessory?: Accessory;
}

export function Wardrobe({ onBack }: { onBack: () => void }) {
  const { creature, wardrobe } = useAppStore(
    useShallow((s) => ({
      creature: s.creature!,
      wardrobe: s.wardrobe,
      // Re-render when progress changes, for the unlock hints.
      history: s.history,
      streak: s.streak,
    })),
  );
  const progress = progressOf(useAppStore.getState());
  // Locked items can be tried on here; nothing is saved.
  const [preview, setPreview] = useState<Preview>({});
  const stage = stageForXp(creature.xp);
  const shownStage = stage === 'egg' ? 'baby' : stage;
  const shownColor = preview.color ?? wardrobe.color;
  const shownAccessory = preview.accessory ?? wardrobe.equipped;

  const rule = (item: UnlockItem) =>
    UNLOCKS.find((u) => u.kind === item.kind && u.id === item.id)!.rule;
  const lockedText = (item: UnlockItem) => {
    const r = rule(item);
    const { current, target } = ruleProgress(r, progress);
    return `${ruleText(r)} (${current} / ${target})`;
  };

  const pickColor = (c: FoxColor, unlocked: boolean) => {
    if (unlocked) {
      useAppStore.getState().setFoxColor(c);
      setPreview((p) => ({ ...p, color: undefined }));
    } else {
      setPreview((p) => ({ ...p, color: c }));
    }
  };
  const pickAccessory = (a: Accessory, unlocked: boolean) => {
    if (unlocked) {
      useAppStore.getState().equipAccessory(a);
      setPreview((p) => ({ ...p, accessory: undefined }));
    } else {
      setPreview((p) => ({ ...p, accessory: a }));
    }
  };

  const previewNotes = [
    preview.color &&
      `${COLOR_NAMES[preview.color]}: ${lockedText({ kind: 'color', id: preview.color } as UnlockItem)}`,
    preview.accessory &&
      `${ACCESSORY_NAMES[preview.accessory]}: ${lockedText({ kind: 'accessory', id: preview.accessory } as UnlockItem)}`,
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-1 flex-col gap-4 pb-4">
      <ScreenHeader title="Wardrobe" onBack={onBack} />

      <Card className="flex flex-col items-center">
        <Creature
          stage={shownStage}
          mood={moodForHappiness(creature.happiness)}
          state="idle"
          color={shownColor}
          accessory={shownAccessory}
          renderer="svg"
          name={creature.name}
          className="h-52 w-52"
        />
        <div className="mt-1 flex min-h-12 w-full flex-col items-center justify-center gap-2 text-center">
          {previewNotes.length > 0 ? (
            <div role="status" className="flex w-full flex-col items-center gap-2">
              <span className="rounded-full bg-sky-100 px-3 py-0.5 text-xs font-extrabold tracking-wide text-sky-900 uppercase dark:bg-sky-900 dark:text-sky-100">
                Preview · not unlocked yet
              </span>
              {previewNotes.map((n) => (
                <p key={n} className="text-sm leading-snug">
                  {n}
                </p>
              ))}
              <Button variant="secondary" className="px-5 text-sm" onClick={() => setPreview({})}>
                Back to my look
              </Button>
            </div>
          ) : (
            <p className="text-sm opacity-65">
              {stage === 'egg'
                ? 'This is how your fox will look once it hatches.'
                : 'Tap anything to try it on, even locked items.'}
            </p>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle>Colors</SectionTitle>
        <div role="radiogroup" aria-label="Fox color" className="mt-2 grid grid-cols-4 gap-2">
          {COLORS.map((c) => {
            const item = { kind: 'color', id: c } as UnlockItem;
            const unlocked = c === 'red' || isUnlocked(wardrobe, item);
            const equipped = wardrobe.color === c;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={equipped}
                aria-label={`${COLOR_NAMES[c]}${unlocked ? '' : `, locked: ${lockedText(item)}. Tap to preview`}`}
                onClick={() => pickColor(c, unlocked)}
                className={`${tileClass(equipped, preview.color === c)} gap-1.5 px-1 pt-3.5 pb-2`}
              >
                {!unlocked && <LockBadge small />}
                <span
                  className={`h-10 w-10 shrink-0 rounded-full border-2 border-black/10 ${unlocked ? '' : 'opacity-55'}`}
                  style={{ backgroundColor: FOX_PALETTES[c].main }}
                />
                <span className={`text-xs leading-tight font-bold ${unlocked ? '' : 'opacity-65'}`}>
                  {COLOR_TILE_NAMES[c]}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionTitle>Accessories</SectionTitle>
        <div role="radiogroup" aria-label="Accessory" className="mt-2 grid grid-cols-3 gap-2">
          {ACCESSORIES.map((a) => {
            const item = { kind: 'accessory', id: a } as UnlockItem;
            const unlocked = a === 'none' || isUnlocked(wardrobe, item);
            const equipped = wardrobe.equipped === a;
            return (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={equipped}
                aria-label={`${ACCESSORY_NAMES[a]}${unlocked ? '' : `, locked: ${lockedText(item)}. Tap to preview`}`}
                onClick={() => pickAccessory(a, unlocked)}
                className={`${tileClass(equipped, preview.accessory === a)} px-1.5 pt-2 pb-2.5`}
              >
                {!unlocked && <LockBadge />}
                <Creature
                  stage={shownStage}
                  mood="happy"
                  state="idle"
                  color={shownColor}
                  accessory={a}
                  renderer="svg"
                  still
                  className={`pointer-events-none h-20 w-20 shrink-0 ${unlocked ? '' : 'opacity-60 grayscale'}`}
                />
                <span
                  className={`mt-1 text-xs leading-tight font-bold ${unlocked ? '' : 'opacity-75'}`}
                >
                  {ACCESSORY_NAMES[a]}
                </span>
                {!unlocked && (
                  <span className="mt-0.5 text-[11px] leading-tight opacity-65">
                    {ruleText(rule(item))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
