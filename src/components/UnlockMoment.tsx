import { useEffect, useRef } from 'react';
import { ACCESSORY_NAMES, COLOR_NAMES, type UnlockItem } from '../config';
import { moodForHappiness, stageForXp } from '../logic/creature';
import type { UnlockId } from '../logic/unlocks';
import { useAppStore } from '../store/useAppStore';
import { Creature } from './Creature/Creature';
import { Button } from './ui';

/** Small celebration after a session when something new unlocks, shown once per item. */
export function UnlockMoment({ item }: { item: UnlockItem & { uid: UnlockId } }) {
  const creature = useAppStore((s) => s.creature!);
  const wardrobe = useAppStore((s) => s.wardrobe);
  const equipRef = useRef<HTMLButtonElement>(null);
  useEffect(() => equipRef.current?.focus(), [item.uid]);

  const stage = stageForXp(creature.xp);
  const name = item.kind === 'color' ? COLOR_NAMES[item.id] : ACCESSORY_NAMES[item.id];
  const done = (equip: boolean) => {
    const s = useAppStore.getState();
    if (equip) {
      if (item.kind === 'color') s.setFoxColor(item.id);
      else s.equipAccessory(item.id);
    }
    s.markUnlockSeen(item.uid);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unlock-title"
        className="animate-pop w-full max-w-xs rounded-3xl bg-cream p-6 text-center shadow-xl dark:bg-dusk"
      >
        <p className="text-sm font-bold tracking-wide text-fox uppercase">Unlocked</p>
        <h2 id="unlock-title" className="text-2xl font-extrabold">
          New: {name.toLowerCase()}!
        </h2>
        <Creature
          stage={stage === 'egg' ? 'baby' : stage}
          mood={moodForHappiness(creature.happiness)}
          state="celebrating"
          color={item.kind === 'color' ? item.id : wardrobe.color}
          accessory={item.kind === 'accessory' ? item.id : wardrobe.equipped}
          renderer="svg"
          className="mx-auto my-2 h-40 w-40"
        />
        <div className="flex flex-col gap-2">
          <Button ref={equipRef} onClick={() => done(true)}>
            Equip now
          </Button>
          <Button variant="ghost" onClick={() => done(false)}>
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}
