import type {
  Accessory,
  FoxColor,
  GameId,
  GameRecords,
  PresetId,
  Settings,
  Stage,
  Wardrobe,
} from './types';

/** XP needed to reach each stage, in growth order. */
export const STAGE_THRESHOLDS: ReadonlyArray<{ stage: Stage; xp: number }> = [
  { stage: 'egg', xp: 0 },
  { stage: 'baby', xp: 4 }, // hatches early, before the first long break
  { stage: 'kid', xp: 125 },
  { stage: 'teen', xp: 375 },
  { stage: 'adult', xp: 1000 },
];

/** After Adult, Level = floor(XP / XP_PER_LEVEL). */
export const XP_PER_LEVEL = 250;

export const HAPPINESS = {
  start: 70,
  min: 0,
  max: 100,
  completed: 10,
  longBreakBonus: 5,
  comebackBonus: 5,
  abandoned: -15,
  dailyDecay: -5,
} as const;

/** Lower bound (inclusive) of each mood band. */
export const MOOD_THRESHOLDS = {
  ecstatic: 80,
  happy: 50,
  meh: 25,
} as const;

export const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  sessionsPerLongBreak: 4,
  graceSeconds: 10,
  soundOn: true,
  keepScreenOn: true,
  autoStartBreaks: true,
  theme: 'system',
  presetId: 'classic',
  lastLabelId: null,
};

export interface TimerLengths {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
}

/** Fixed presets; 'custom' uses the lengths saved in settings. XP always equals focus minutes. */
export const PRESETS: Record<Exclude<PresetId, 'custom'>, TimerLengths> = {
  classic: { focusMin: 25, shortBreakMin: 5, longBreakMin: 15 },
  deep: { focusMin: 50, shortBreakMin: 10, longBreakMin: 20 },
  marathon: { focusMin: 90, shortBreakMin: 20, longBreakMin: 30 },
};

export const PRESET_ORDER: PresetId[] = ['classic', 'deep', 'marathon', 'custom'];

export const PRESET_NAMES: Record<PresetId, string> = {
  classic: 'Classic',
  deep: 'Deep',
  marathon: 'Marathon',
  custom: 'Custom',
};

export const DEFAULT_WARDROBE: Wardrobe = {
  color: 'red',
  unlockedColors: ['red'],
  equipped: 'none',
  unlockedAccessories: ['none'],
  seenUnlocks: [],
};

export const MAX_ACTIVE_LABELS = 12;
export const LABEL_NAME_MAX = 20;

/** The 8 pastel label colors. */
export const LABEL_COLORS = [
  '#f7a8b8',
  '#f9c38f',
  '#f6dd7c',
  '#a8dcae',
  '#8fd3cf',
  '#9cc6f0',
  '#b9adf0',
  '#d8b4e2',
] as const;

/** Dev-only "fast mode": 1 min focus, 10 s breaks. */
export const FAST_MODE_SETTINGS: Pick<
  Settings,
  'focusMin' | 'shortBreakMin' | 'longBreakMin' | 'presetId'
> = {
  presetId: 'custom',
  focusMin: 1,
  shortBreakMin: 10 / 60,
  longBreakMin: 10 / 60,
};

export const SETTINGS_LIMITS = {
  // Shortest focus timer users can set; only the dev fast mode goes below it.
  focusMin: { min: 25, max: 180 },
  shortBreakMin: { min: 1, max: 60 },
  longBreakMin: { min: 1, max: 90 },
  sessionsPerLongBreak: { min: 2, max: 8 },
  graceSeconds: { min: 0, max: 60 },
} as const;

/** Pausing is unlimited in V1 (honor system). */
export const MAX_PAUSES = Infinity;

/** How often `lastSeenAt` is saved while the page is visible. */
export const HEARTBEAT_MS = 5_000;

/** Display refresh interval (~4 times per second). */
export const TICK_MS = 250;

export const HISTORY_LIMIT = 500;

/** Celebration overlay after a completed session, before the break starts. */
export const CELEBRATION_MS = 3_000;

/** How long Celebrating / Disappointed override the mood face. */
export const TRANSIENT_STATE_MS = 4_000;

export const PERSIST_KEY = 'focus-creature';
export const PERSIST_VERSION = 3;

export type UnlockRule =
  | { type: 'sessions'; count: number }
  | { type: 'stage'; stage: Stage }
  | { type: 'streak'; days: number }
  | { type: 'focusHours'; hours: number };

export type UnlockItem =
  | { kind: 'accessory'; id: Exclude<Accessory, 'none'> }
  | { kind: 'color'; id: Exclude<FoxColor, 'red'> };

/** Wardrobe unlocks, in the order they are usually earned. */
export const UNLOCKS: ReadonlyArray<UnlockItem & { rule: UnlockRule }> = [
  { kind: 'accessory', id: 'glasses', rule: { type: 'sessions', count: 10 } },
  { kind: 'color', id: 'arctic', rule: { type: 'stage', stage: 'kid' } },
  { kind: 'accessory', id: 'headphones', rule: { type: 'streak', days: 7 } },
  { kind: 'accessory', id: 'beanie', rule: { type: 'sessions', count: 25 } },
  { kind: 'color', id: 'silver', rule: { type: 'stage', stage: 'teen' } },
  { kind: 'accessory', id: 'flowerCrown', rule: { type: 'focusHours', hours: 10 } },
  { kind: 'accessory', id: 'bowTie', rule: { type: 'sessions', count: 50 } },
  { kind: 'color', id: 'midnight', rule: { type: 'stage', stage: 'adult' } },
  { kind: 'accessory', id: 'starCape', rule: { type: 'streak', days: 30 } },
];

export const ACCESSORY_NAMES: Record<Accessory, string> = {
  none: 'None',
  glasses: 'Glasses',
  headphones: 'Headphones',
  beanie: 'Beanie',
  flowerCrown: 'Flower crown',
  bowTie: 'Bow tie',
  starCape: 'Star cape',
};

export const COLOR_NAMES: Record<FoxColor, string> = {
  red: 'Red',
  arctic: 'Arctic white',
  silver: 'Silver',
  midnight: 'Midnight',
};

export const DEFAULT_GAME_RECORDS: GameRecords = {
  catch: { best: null, plays: 0 },
  memory: { best: null, plays: 0 },
};

/** Mini games, playable whenever no focus session is running. High scores only, no rewards. */
export const GAMES: Record<
  GameId,
  { name: string; blurb: string; better: 'higher' | 'lower'; unit: string }
> = {
  catch: {
    name: 'Catch the treats',
    blurb: 'Move Pip to catch falling berries.',
    better: 'higher',
    unit: 'points',
  },
  memory: {
    name: 'Memory match',
    blurb: 'Flip cards to find the pairs.',
    better: 'lower',
    unit: 'moves',
  },
};
