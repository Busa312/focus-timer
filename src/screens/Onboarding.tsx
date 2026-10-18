import { useState } from 'react';
import { Creature } from '../components/Creature/Creature';
import { Button } from '../components/ui';
import { useAppStore } from '../store/useAppStore';

export function Onboarding() {
  const [name, setName] = useState('');
  const trimmed = name.trim();

  return (
    <form
      className="flex flex-1 flex-col items-center justify-center gap-6 text-center"
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed) useAppStore.getState().onboard(trimmed);
      }}
    >
      <Creature stage="egg" mood="happy" state="idle" />
      <div>
        <h1 className="text-2xl font-extrabold">A little egg!</h1>
        <p className="mt-2 opacity-75">Focus to help it grow.</p>
      </div>
      <label className="flex w-full max-w-xs flex-col gap-2 text-left text-sm font-bold">
        Name your fox
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="e.g. Pip"
          autoComplete="off"
          className="min-h-11 rounded-2xl border-2 border-ink/10 bg-white px-4 text-base font-normal outline-none focus-visible:border-sky-500 dark:border-white/10 dark:bg-dusk"
        />
      </label>
      <Button type="submit" disabled={!trimmed} className="min-w-48 text-lg">
        Let&apos;s start
      </Button>
    </form>
  );
}
