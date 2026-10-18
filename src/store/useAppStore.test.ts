import { clear, get } from 'idb-keyval';
import { PERSIST_KEY } from '../config';
import { createAppStore, type AppStoreApi } from './useAppStore';

const MIN = 60_000;

function waitForHydration(store: AppStoreApi) {
  return new Promise<void>((resolve) => {
    if (store.getState().hydrated) return resolve();
    const unsub = store.subscribe((s) => {
      if (s.hydrated) {
        unsub();
        resolve();
      }
    });
  });
}

async function flushWrites() {
  // idb-keyval writes are async; give them a moment to land.
  await new Promise((r) => setTimeout(r, 20));
}

describe('useAppStore persistence', () => {
  let clock = new Date(2026, 9, 19, 9, 0).getTime();
  const now = () => clock;

  beforeEach(async () => {
    await clear();
    clock = new Date(2026, 9, 19, 9, 0).getTime();
  });

  it('starts empty and hydrates', async () => {
    const store = createAppStore(now);
    await waitForHydration(store);
    expect(store.getState().creature).toBeNull();
    expect(store.getState().settings.focusMin).toBe(25);
  });

  it('keeps all progress and an active session across a reload', async () => {
    const a = createAppStore(now);
    await waitForHydration(a);
    a.getState().onboard('Pip');
    a.getState().startFocus();
    clock += 25 * MIN;
    a.getState().tick();
    expect(a.getState().creature!.xp).toBe(25);
    a.getState().startBreak();
    a.getState().skipBreak();
    a.getState().startFocus();
    clock += 3 * MIN;
    a.getState().heartbeat();
    await flushWrites();

    const saved = await get<string>(PERSIST_KEY);
    expect(JSON.parse(saved!).version).toBe(2);

    // "Reload" 2 s later: a fresh store reading the same IndexedDB.
    clock += 2_000;
    const b = createAppStore(now);
    await waitForHydration(b);
    const s = b.getState();
    expect(s.creature).toMatchObject({ name: 'Pip', xp: 25, happiness: 80 });
    expect(s.history).toHaveLength(1);
    expect(s.cycleCount).toBe(1);
    expect(s.streak.current).toBe(1);
    expect(s.active).toMatchObject({ phase: 'focus', id: a.getState().active!.id });
    // Transient UI state is not persisted.
    expect(s.event).toBeNull();
  });

  it('abandons a session on restart when the app was closed too long', async () => {
    const a = createAppStore(now);
    await waitForHydration(a);
    a.getState().onboard('Pip');
    a.getState().startFocus();
    await flushWrites();

    clock += MIN;
    const b = createAppStore(now);
    await waitForHydration(b);
    expect(b.getState().active).toBeNull();
    expect(b.getState().creature!.happiness).toBe(55);
    expect(b.getState().event).toMatchObject({ type: 'abandoned', reason: 'appClosed' });
  });

  it('merges new default settings into older saved settings', async () => {
    const a = createAppStore(now);
    await waitForHydration(a);
    a.getState().updateSettings({ focusMin: 50 });
    await flushWrites();
    const b = createAppStore(now);
    await waitForHydration(b);
    expect(b.getState().settings).toMatchObject({ focusMin: 50, shortBreakMin: 5 });
  });

  it('resetAll clears everything', async () => {
    const a = createAppStore(now);
    await waitForHydration(a);
    a.getState().onboard('Pip');
    a.getState().resetAll();
    await flushWrites();
    const b = createAppStore(now);
    await waitForHydration(b);
    expect(b.getState().creature).toBeNull();
    expect(b.getState().history).toEqual([]);
  });
});
