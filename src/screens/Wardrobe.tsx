import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Creature } from '../components/Creature/Creature';
import { FOX_PALETTES } from '../components/Creature/palette';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../components/ui';
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

function Padlock() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V8a3 3 0 0 0-6 0z" />
    </svg>
  );
}

export function Wardrobe({ onBack }: { onBack: () => void }) {
  const state = useAppStore(
    useShallow((s) => ({
      creature: s.creature!,
      wardrobe: s.wardrobe,
      history: s.history,
      streak: s.streak,
    })),
  );
  const { creature, wardrobe } = state;
  const progress = progressOf(useAppStore.getState());
  const [hint, setHint] = useState<string | null>(null);
  const stage = stageForXp(creature.xp);

  const rule = (item: UnlockItem) =>
    UNLOCKS.find((u) => u.kind === item.kind && u.id === item.id)!.rule;
  const lockedText = (item: UnlockItem) => {
    const r = rule(item);
    const { current, target } = ruleProgress(r, progress);
    return `${ruleText(r)} (${current} / ${target})`;
  };

  return (
    <div className="flex flex-1 flex-col gap-3 pb-3">
      <ScreenHeader title="Wardrobe" onBack={onBack} />

      <div className="flex justify-center">
        <Creature
          stage={stage === 'egg' ? 'baby' : stage}
          mood={moodForHappiness(creature.happiness)}
          state="idle"
          color={wardrobe.color}
          accessory={wardrobe.equipped}
          renderer="svg"
          name={creature.name}
          className="h-56 w-56"
        />
      </div>
      {stage === 'egg' && (
        <p className="-mt-2 text-center text-sm opacity-70">Preview: your fox after it hatches.</p>
      )}
      {hint && (
        <p role="status" className="text-center text-sm font-bold">
          {hint}
        </p>
      )}

      <Card>
        <h2 className="mb-2 text-sm font-bold tracking-wide uppercase opacity-60">Colors</h2>
        <div role="radiogroup" aria-label="Fox color" className="grid grid-cols-4 gap-2">
          {COLORS.map((c) => {
            const item = { kind: 'color', id: c } as UnlockItem;
            const unlocked = c === 'red' || isUnlocked(wardrobe, item);
            const selected = wardrobe.color === c;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-disabled={!unlocked}
                aria-label={`${COLOR_NAMES[c]}${unlocked ? '' : `, locked: ${lockedText(item)}`}`}
                onClick={() =>
                  unlocked
                    ? (useAppStore.getState().setFoxColor(c), setHint(null))
                    : setHint(`${COLOR_NAMES[c]}: ${lockedText(item)}`)
                }
                className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 text-xs font-bold focus-visible:outline-3 focus-visible:outline-sky-500 ${
                  selected
                    ? 'border-fox bg-peach/40 dark:bg-fox/20'
                    : 'border-transparent bg-cream dark:bg-night'
                }`}
              >
                <span
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-black/10 ${unlocked ? '' : 'opacity-40'}`}
                  style={{ backgroundColor: FOX_PALETTES[c].main }}
                >
                  {!unlocked && (
                    <span className="text-ink">
                      <Padlock />
                    </span>
                  )}
                </span>
                <span className={unlocked ? '' : 'opacity-60'}>{COLOR_NAMES[c]}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-bold tracking-wide uppercase opacity-60">Accessories</h2>
        <div role="radiogroup" aria-label="Accessory" className="grid grid-cols-3 gap-2">
          {ACCESSORIES.map((a) => {
            const item = { kind: 'accessory', id: a } as UnlockItem;
            const unlocked = a === 'none' || isUnlocked(wardrobe, item);
            const selected = wardrobe.equipped === a;
            return (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-disabled={!unlocked}
                aria-label={`${ACCESSORY_NAMES[a]}${unlocked ? '' : `, locked: ${lockedText(item)}`}`}
                onClick={() =>
                  unlocked
                    ? (useAppStore.getState().equipAccessory(a), setHint(null))
                    : setHint(`${ACCESSORY_NAMES[a]}: ${lockedText(item)}`)
                }
                className={`relative flex min-h-28 flex-col items-center justify-end rounded-2xl border-2 p-1.5 text-xs font-bold focus-visible:outline-3 focus-visible:outline-sky-500 ${
                  selected
                    ? 'border-fox bg-peach/40 dark:bg-fox/20'
                    : 'border-transparent bg-cream dark:bg-night'
                }`}
              >
                <Creature
                  stage={stage === 'egg' ? 'baby' : stage}
                  mood="happy"
                  state="idle"
                  color={wardrobe.color}
                  accessory={a}
                  renderer="svg"
                  className={`pointer-events-none h-20 w-20 ${unlocked ? '' : 'opacity-35 grayscale'}`}
                />
                <span className={`flex items-center gap-1 ${unlocked ? '' : 'opacity-70'}`}>
                  {!unlocked && <Padlock />}
                  {ACCESSORY_NAMES[a]}
                </span>
                {!unlocked && (
                  <span className="text-[10px] leading-tight font-normal opacity-70">
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
