import { DEFAULT_GAME_RECORDS, DEFAULT_SETTINGS, DEFAULT_WARDROBE, PRESETS } from '../config';
import type { PersistedState, PresetId, Settings } from '../types';

/** Saved data as V2 wrote it (no mini game scores). */
export type PersistedStateV2 = Omit<PersistedState, 'version' | 'games'> & { version: 2 };

/** Saved data as V1 wrote it (no labels, presets or wardrobe). */
export type PersistedStateV1 = Omit<
  PersistedStateV2,
  'version' | 'labels' | 'wardrobe' | 'settings'
> & {
  version: 1;
  settings: Omit<Settings, 'presetId' | 'lastLabelId' | 'theme'>;
};

/** Keep a V1 user's timer: Classic if it matches, otherwise Custom with their lengths. */
function presetFor(s: PersistedStateV1['settings']): PresetId {
  const c = PRESETS.classic;
  return s.focusMin === c.focusMin &&
    s.shortBreakMin === c.shortBreakMin &&
    s.longBreakMin === c.longBreakMin
    ? 'classic'
    : 'custom';
}

export function migrateV1toV2(v1: PersistedStateV1): PersistedStateV2 {
  const settings = { ...DEFAULT_SETTINGS, ...v1.settings };
  return {
    ...v1,
    version: 2,
    settings: { ...settings, presetId: presetFor(settings), lastLabelId: null },
    labels: [],
    wardrobe: { ...DEFAULT_WARDROBE },
  };
}

export function migrateV2toV3(v2: PersistedStateV2): PersistedState {
  return { ...v2, version: 3, games: structuredClone(DEFAULT_GAME_RECORDS) };
}

/** Upgrade saved data from an older `version` to the current one, step by step. */
export function migrate(persisted: unknown, fromVersion: number): PersistedState {
  let state = persisted as Record<string, unknown>;
  if (fromVersion < 2) state = migrateV1toV2(state as unknown as PersistedStateV1) as never;
  if (fromVersion < 3) state = migrateV2toV3(state as unknown as PersistedStateV2) as never;
  return state as unknown as PersistedState;
}
