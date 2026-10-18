import { useEffect, useState } from 'react';
import { TICK_MS } from '../config';
import { useAppStore } from '../store/useAppStore';

const isVisible = () => document.visibilityState === 'visible';

/**
 * Re-renders about 4 times per second while `enabled` and the page is visible,
 * and runs the session outcome check on every tick. Returns the current time.
 */
export function useTicker(enabled: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    let id: number | undefined;
    const run = () => {
      // Never decide while hidden; the visibility handler owns that.
      if (!isVisible()) return;
      useAppStore.getState().tick();
      setNow(Date.now());
    };
    const start = () => {
      if (id !== undefined || !isVisible()) return;
      run();
      id = window.setInterval(run, TICK_MS);
    };
    const stop = () => {
      if (id === undefined) return;
      window.clearInterval(id);
      id = undefined;
    };
    const onVisibility = () => (isVisible() ? start() : stop());

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);

  return now;
}
