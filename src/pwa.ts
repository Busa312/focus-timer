import { Workbox } from 'workbox-window';
import type { AppStore } from './store/useAppStore';
import { useAppStore } from './store/useAppStore';

/**
 * A good moment to reload for an update: no session of any kind, no earned
 * break waiting, and no celebration or message on screen.
 */
export function isIdleForUpdate(s: Pick<AppStore, 'active' | 'pendingBreak' | 'event'>): boolean {
  return s.active === null && s.pendingBreak === null && s.event === null;
}

/** Reload now if idle, otherwise as soon as the app becomes idle. */
export function reloadWhenIdle(reload: () => void = () => window.location.reload()): () => void {
  if (isIdleForUpdate(useAppStore.getState())) {
    reload();
    return () => {};
  }
  const unsub = useAppStore.subscribe((s) => {
    if (isIdleForUpdate(s)) {
      unsub();
      reload();
    }
  });
  return unsub;
}

const UPDATE_CHECK_MS = 60 * 60_000;

/**
 * Registers the service worker. Updates install in the background (autoUpdate),
 * but the page only reloads to the new version at the next idle moment, never
 * during a focus session.
 */
export function setupServiceWorker(): void {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  const wb = new Workbox('/sw.js', { scope: '/' });
  // If an update is ever left waiting, activate it; the reload still waits for idle.
  wb.addEventListener('waiting', () => wb.messageSkipWaiting());
  wb.addEventListener('controlling', (e) => {
    if (e.isUpdate) reloadWhenIdle();
  });
  void wb.register();

  // Look for a new version when the app comes back to the foreground, at most hourly.
  let lastCheck = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || Date.now() - lastCheck < UPDATE_CHECK_MS) return;
    lastCheck = Date.now();
    void wb.update();
  });
}
