import { DEFAULT_SETTINGS, DEFAULT_WARDROBE, PRESETS } from '../config';
import type { PersistedState, PresetId, Settings } from '../types';

/** Saved data as V1 wrote it (no labels, presets or wardrobe). */
export type PersistedStateV1 = Omit<
  PersistedState,
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

export function migrateV1toV2(v1: PersistedStateV1): PersistedState {
  const settings = { ...DEFAULT_SETTINGS, ...v1.settings };
  return {
    ...v1,
    version: 2,
    settings: { ...settings, presetId: presetFor(settings), lastLabelId: null },
    labels: [],
    wardrobe: { ...DEFAULT_WARDROBE },
  };
}

/** Upgrade saved data from an older `version` to the current one, step by step. */
export function migrate(persisted: unknown, fromVersion: number): PersistedState {
  let state = persisted as Record<string, unknown>;
  if (fromVersion < 2) state = migrateV1toV2(state as unknown as PersistedStateV1) as never;
  return state as unknown as PersistedState;
}
