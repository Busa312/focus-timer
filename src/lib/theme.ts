import { useEffect, useSyncExternalStore } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { ThemePref } from '../types';

export type Theme = 'light' | 'dark';

/** Mirror of the setting for the pre-paint script in index.html. */
export const THEME_STORAGE_KEY = 'focus-creature:theme';

const QUERY = '(prefers-color-scheme: dark)';
const THEME_COLOR: Record<Theme, string> = { light: '#fdf6ee', dark: '#1f1a24' };

export function osTheme(): Theme {
  return typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches
    ? 'dark'
    : 'light';
}

export function resolveTheme(pref: ThemePref, os: Theme): Theme {
  return pref === 'system' ? os : pref;
}

/**
 * The preference after tapping the light/dark button: the opposite of what is
 * showing, or back to following the OS when that is what the OS shows anyway.
 */
export function toggledPref(pref: ThemePref, os: Theme): ThemePref {
  const next: Theme = resolveTheme(pref, os) === 'dark' ? 'light' : 'dark';
  return next === os ? 'system' : next;
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

function subscribeOs(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

/** The OS light/dark setting, live. */
export function useOsTheme(): Theme {
  return useSyncExternalStore(subscribeOs, osTheme, () => 'light');
}

/** The theme on screen right now. */
export function useTheme(): Theme {
  const pref = useAppStore((s) => s.settings.theme);
  return resolveTheme(pref, useOsTheme());
}

/** Keeps <html data-theme> in sync with the setting and the OS. */
export function useThemeSync(): void {
  const pref = useAppStore((s) => s.settings.theme);
  const hydrated = useAppStore((s) => s.hydrated);
  const theme = resolveTheme(pref, useOsTheme());
  useEffect(() => {
    // Before saved settings load, keep what the pre-paint script chose.
    if (!hydrated) return;
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch {
      // Private mode: the app still themes correctly once settings load.
    }
  }, [theme, pref, hydrated]);
}

export function toggleTheme(): void {
  const s = useAppStore.getState();
  s.updateSettings({ theme: toggledPref(s.settings.theme, osTheme()) });
}
