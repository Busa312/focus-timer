import { set } from 'idb-keyval';
import { PERSIST_KEY } from '../config';
import { migrate, migrateV1toV2, migrateV2toV3, type PersistedStateV1 } from './migrations';
import { createAppStore, useAppStore } from './useAppStore';

const NOW = new Date(2026, 9, 19, 9, 0).getTime();

function v1(overrides: Partial<PersistedStateV1> = {}): PersistedStateV1 {
  return {
    version: 1,
    creature: {
      name: 'Pip',
      xp: 430,
      happiness: 62,
      hatchedAt: NOW - 10 * 86_400_000,
      lastDecayCheck: '2026-10-19',
      pendingComeback: true,
    },
    active: null,
    cycleCount: 3,
    pendingBreak: null,
    history: [
      {
        id: 'a',
        startedAt: NOW - 3e6,
        endedAt: NOW - 1.5e6,
        focusMinutes: 25,
        result: 'completed',
      },
      {
        id: 'b',
        startedAt: NOW - 1e6,
        endedAt: NOW - 9e5,
        focusMinutes: 2,
        result: 'abandoned',
        abandonReason: 'leftApp',
      },
    ],
    streak: { current: 6, best: 9, lastCompletedDate: '2026-10-19' },
    settings: {
      focusMin: 25,
      shortBreakMin: 5,
      longBreakMin: 15,
      sessionsPerLongBreak: 4,
      graceSeconds: 20,
      soundOn: false,
      keepScreenOn: true,
      autoStartBreaks: false,
    },
    ...overrides,
  };
}

describe('migrateV1toV2', () => {
  it('keeps every V1 field and fills V2 defaults', () => {
    const old = v1();
    const next = migrateV1toV2(old);
    expect(next.version).toBe(2);
    expect(next.creature).toEqual(old.creature);
    expect(next.history).toEqual(old.history);
    expect(next.streak).toEqual(old.streak);
    expect(next.cycleCount).toBe(3);
    expect(next.settings).toEqual({
      ...old.settings,
      presetId: 'classic',
      lastLabelId: null,
      theme: 'system',
    });
    expect(next.labels).toEqual([]);
    expect(next.wardrobe).toEqual({
      color: 'red',
      unlockedColors: ['red'],
      equipped: 'none',
      unlockedAccessories: ['none'],
      seenUnlocks: [],
    });
  });

  it('keeps non-default timer lengths as the Custom preset', () => {
    const old = v1();
    old.settings = { ...old.settings, focusMin: 40, shortBreakMin: 8 };
    const next = migrateV1toV2(old);
    expect(next.settings).toMatchObject({ presetId: 'custom', focusMin: 40, shortBreakMin: 8 });
  });

  it('keeps an active session', () => {
    const active = {
      id: 's',
      phase: 'focus' as const,
      startedAt: NOW,
      endsAt: NOW + 1_500_000,
      pausedAt: null,
      pausedTotalMs: 0,
      hiddenAt: null,
      lastSeenAt: NOW,
    };
    expect(migrateV1toV2(v1({ active })).active).toEqual(active);
  });

  it('migrate() leaves current data alone', () => {
    const current = migrate(v1(), 1);
    expect(migrate(current, 3)).toBe(current);
  });
});

describe('migrateV2toV3', () => {
  it('adds empty mini game records and keeps everything else', () => {
    const v2 = migrateV1toV2(v1());
    const v3 = migrateV2toV3(v2);
    expect(v3.version).toBe(3);
    expect(v3.games).toEqual({
      catch: { best: null, plays: 0 },
      memory: { best: null, plays: 0 },
    });
    // Every V2 field is carried over unchanged.
    expect(v3).toMatchObject({ ...v2, version: 3 });
  });

  it('upgrades V1 data all the way to V3', () => {
    const v3 = migrate(v1(), 1);
    expect(v3.version).toBe(3);
    expect(v3.wardrobe.color).toBe('red');
    expect(v3.games.catch.plays).toBe(0);
  });
});

describe('opening the app with saved V1 data', () => {
  it('upgrades to the current version in IndexedDB with nothing lost', async () => {
    // Let the app-wide store finish its own hydration write first.
    await new Promise<void>((resolve) => {
      if (useAppStore.getState().hydrated) return resolve();
      const unsub = useAppStore.subscribe((s) => s.hydrated && (unsub(), resolve()));
    });
    await new Promise((r) => setTimeout(r, 20));
    const old = v1();
    await set(PERSIST_KEY, JSON.stringify({ state: old, version: 1 }));
    const store = createAppStore(() => NOW + 60_000);
    await new Promise<void>((resolve) => {
      if (store.getState().hydrated) return resolve();
      const unsub = store.subscribe((s) => s.hydrated && (unsub(), resolve()));
    });
    const s = store.getState();
    expect(s.version).toBe(3);
    expect(s.games.memory).toEqual({ best: null, plays: 0 });
    expect(s.creature).toEqual(old.creature);
    expect(s.history).toEqual(old.history);
    expect(s.streak).toEqual(old.streak);
    expect(s.settings).toMatchObject({ graceSeconds: 20, soundOn: false, presetId: 'classic' });
    expect(s.wardrobe.color).toBe('red');
    expect(s.labels).toEqual([]);
  });
});
