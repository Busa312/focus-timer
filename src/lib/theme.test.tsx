import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';
import { initialState } from '../logic/engine';
import { useAppStore } from '../store/useAppStore';
import { resolveTheme, THEME_STORAGE_KEY, toggledPref } from './theme';

/** Fake OS setting with a working change listener. */
function mockOs(dark: boolean) {
  const listeners = new Set<() => void>();
  let isDark = dark;
  window.matchMedia = vi.fn((q: string) => ({
    get matches() {
      return q.includes('prefers-color-scheme: dark') ? isDark : false;
    },
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  })) as unknown as typeof window.matchMedia;
  return (next: boolean) => {
    isDark = next;
    act(() => listeners.forEach((l) => l()));
  };
}

const htmlTheme = () => document.documentElement.dataset.theme;

async function hydrated() {
  if (useAppStore.getState().hydrated) return;
  await new Promise<void>((resolve) => {
    const unsub = useAppStore.subscribe((s) => s.hydrated && (unsub(), resolve()));
  });
}

describe('theme logic', () => {
  it('follows the OS by default', () => {
    expect(resolveTheme('system', 'dark')).toBe('dark');
    expect(resolveTheme('system', 'light')).toBe('light');
    expect(resolveTheme('light', 'dark')).toBe('light');
  });

  it('the button flips what is showing, and goes back to the OS when they match', () => {
    expect(toggledPref('system', 'dark')).toBe('light');
    expect(toggledPref('light', 'dark')).toBe('system');
    expect(toggledPref('system', 'light')).toBe('dark');
    expect(toggledPref('dark', 'light')).toBe('system');
  });
});

describe('theme in the app', () => {
  beforeEach(async () => {
    await hydrated();
    useAppStore.setState({ ...initialState(), event: null });
    useAppStore.getState().onboard('Pip');
    localStorage.clear();
  });

  afterEach(() => {
    // @ts-expect-error jsdom has no matchMedia by default
    delete window.matchMedia;
  });

  it('defaults to the OS mode and follows it when it changes', () => {
    const setOs = mockOs(true);
    render(<App />);
    expect(useAppStore.getState().settings.theme).toBe('system');
    expect(htmlTheme()).toBe('dark');
    setOs(false);
    expect(htmlTheme()).toBe('light');
  });

  it('the header button switches light and dark, and remembers it', () => {
    mockOs(false);
    render(<App />);
    expect(htmlTheme()).toBe('light');
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(htmlTheme()).toBe('dark');
    expect(useAppStore.getState().settings.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(htmlTheme()).toBe('light');
    expect(useAppStore.getState().settings.theme).toBe('system');
  });

  it('Settings offers System / Light / Dark, applied right away', () => {
    mockOs(false);
    render(<App />);
    fireEvent.click(within(screen.getByRole('navigation')).getByText('Settings'));
    const group = screen.getByRole('radiogroup', { name: 'Theme' });
    expect(within(group).getByRole('radio', { name: 'System' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    fireEvent.click(within(group).getByRole('radio', { name: 'Dark' }));
    expect(htmlTheme()).toBe('dark');
    expect(useAppStore.getState().settings.theme).toBe('dark');
    // No unsaved changes left behind.
    expect(screen.getByText('Save')).toBeDisabled();
    fireEvent.click(within(group).getByRole('radio', { name: 'System' }));
    expect(htmlTheme()).toBe('light');
  });
});
