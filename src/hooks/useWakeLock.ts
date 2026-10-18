import { useEffect, useState } from 'react';

export const wakeLockSupported = () => typeof navigator !== 'undefined' && 'wakeLock' in navigator;

/**
 * Keeps the screen on while `wanted`. The browser drops the lock whenever the
 * page is hidden, so it is re-requested when the page becomes visible again.
 * Returns whether a lock is currently held.
 */
export function useWakeLock(wanted: boolean): boolean {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!wanted || !wakeLockSupported()) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      if (document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      try {
        const s = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void s.release();
          return;
        }
        sentinel = s;
        setHeld(true);
        s.addEventListener('release', () => {
          if (sentinel === s) setHeld(false);
        });
      } catch {
        // Denied (e.g. battery saver); the session still works.
        setHeld(false);
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (sentinel && !sentinel.released) void sentinel.release();
      sentinel = null;
      setHeld(false);
    };
  }, [wanted]);

  return held;
}
