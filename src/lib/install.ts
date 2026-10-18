import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/**
 * Capture the install prompt as early as possible (it can fire before React
 * mounts), so Settings can offer an "Install app" button later.
 */
export function captureInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    emit();
  });
}

export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches)
  );
}

/** iPhone / iPad Safari, which has no install prompt: Share → Add to Home Screen instead. */
export function isIos(): boolean {
  const ua = navigator.userAgent;
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadOs;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  emit();
  await e.prompt();
  const { outcome } = await e.userChoice;
  return outcome === 'accepted';
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** 'prompt' = Android / desktop button available; 'ios' = show the tip; null = nothing to offer. */
export function useInstallOption(): 'prompt' | 'ios' | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      if (installed || isStandalone()) return null;
      if (deferred) return 'prompt';
      return isIos() ? 'ios' : null;
    },
    () => null,
  );
}
