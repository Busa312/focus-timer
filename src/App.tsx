import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { EventLayer } from './components/Celebration';
import { NavBar, type Screen } from './components/NavBar';
import { useTicker } from './hooks/useTicker';
import { useVisibility } from './hooks/useVisibility';
import { useWakeLock } from './hooks/useWakeLock';
import { useThemeSync } from './lib/theme';
import { formatClock, remainingMs } from './logic/timer';
import { PHASE_LABEL } from './lib/labels';
import { Home } from './screens/Home';
import { Labels } from './screens/Labels';
import { Onboarding } from './screens/Onboarding';
import { Settings } from './screens/Settings';
import { Stats } from './screens/Stats';
import { Wardrobe } from './screens/Wardrobe';
import { useAppStore } from './store/useAppStore';
import { GameOverlay } from './components/games/Games';
import type { GameId } from './types';

const BASE_TITLE = 'Focus Fox';

export default function App() {
  const { hydrated, hasCreature, active } = useAppStore(
    useShallow((s) => ({
      hydrated: s.hydrated,
      hasCreature: s.creature !== null,
      active: s.active,
    })),
  );
  const [screen, setScreen] = useState<Screen>('home');
  const [game, setGame] = useState<GameId | null>(null);
  const keepScreenOn = useAppStore((s) => s.settings.keepScreenOn);
  const now = useTicker(active !== null);
  useVisibility(active !== null);
  // Screen stays on during running focus; released on pause, break and end.
  useWakeLock(keepScreenOn && active?.phase === 'focus' && active.pausedAt === null);
  useThemeSync();

  // Countdown in the tab title, e.g. "18:42 · Focus".
  useEffect(() => {
    document.title = active
      ? `${formatClock(remainingMs(active, Math.max(now, active.startedAt)))} · ${active.pausedAt ? 'Paused' : PHASE_LABEL[active.phase]}`
      : BASE_TITLE;
  }, [active, now]);

  if (!hydrated) {
    return <div className="min-h-dvh" aria-busy="true" />;
  }

  if (!hasCreature) {
    return (
      <Shell>
        <Onboarding />
      </Shell>
    );
  }

  return (
    <Shell>
      {screen === 'home' && (
        <Home now={now} onManageLabels={() => setScreen('labels')} onPlay={setGame} />
      )}
      {screen === 'stats' && <Stats onBack={() => setScreen('home')} />}
      {screen === 'wardrobe' && <Wardrobe onBack={() => setScreen('home')} />}
      {screen === 'settings' && (
        <Settings onBack={() => setScreen('home')} onOpenLabels={() => setScreen('labels')} />
      )}
      {screen === 'labels' && <Labels onBack={() => setScreen('settings')} />}
      <NavBar screen={screen} onChange={setScreen} />
      <EventLayer />
      {/* Games close if a focus session somehow starts (they're only for off-focus time). */}
      {game && active?.phase !== 'focus' && (
        <GameOverlay game={game} now={now} onClose={() => setGame(null)} />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="safe-area mx-auto flex min-h-dvh w-full max-w-120 flex-col">{children}</main>
  );
}
