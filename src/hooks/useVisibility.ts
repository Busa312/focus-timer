import { useEffect } from 'react';
import { HEARTBEAT_MS } from '../config';
import { useAppStore } from '../store/useAppStore';

const isVisible = () => document.visibilityState === 'visible';

/** Best effort: a local notification when leaving mid-focus. Nothing depends on it. */
function notifyLeaving() {
  const s = useAppStore.getState();
  const a = s.active;
  if (!a || a.phase !== 'focus' || a.pausedAt !== null) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const name = s.creature?.name ?? 'your fox';
  const title = `Come back in ${s.settings.graceSeconds} s`;
  const body = `or ${name} gets sad`;
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      void navigator.serviceWorker.ready
        .then((reg) =>
          reg.showNotification(title, { body, tag: 'leave', icon: '/icons/pwa-192x192.png' }),
        )
        .catch(() => {});
    } else {
      new Notification(title, { body, tag: 'leave' });
    }
  } catch {
    // Some platforms (e.g. Android Chrome) only allow SW notifications.
  }
}

/**
 * Leave detection: records when the page is hidden and decides on return,
 * using saved timestamps only (JS may be frozen while hidden). While visible
 * with an active session, saves `lastSeenAt` every 5 s so a killed app can be
 * judged on restart.
 */
export function useVisibility(hasActiveSession: boolean): void {
  useEffect(() => {
    const onHide = () => {
      const s = useAppStore.getState();
      if (s.active?.hiddenAt != null) return;
      s.handleHidden();
      notifyLeaving();
    };
    const onChange = () => (isVisible() ? useAppStore.getState().handleVisible() : onHide());
    // pagehide covers iOS cases where visibilitychange is unreliable on app switch.
    document.addEventListener('visibilitychange', onChange);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onChange);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  useEffect(() => {
    if (!hasActiveSession) return;
    const id = window.setInterval(() => {
      if (isVisible()) useAppStore.getState().heartbeat();
    }, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [hasActiveSession]);
}
