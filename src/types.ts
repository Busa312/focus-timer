export type Stage = 'egg' | 'baby' | 'kid' | 'teen' | 'adult';
export type Mood = 'ecstatic' | 'happy' | 'meh' | 'sad';
export type Phase = 'idle' | 'focus' | 'shortBreak' | 'longBreak';
export type ActivePhase = Exclude<Phase, 'idle'>;

/** Short-lived states that override the mood face. */
export type CreatureState =
  'idle' | 'focused' | 'playing' | 'celebrating' | 'disappointed' | 'worried';

export type AbandonReason = 'gaveUp' | 'leftApp' | 'appClosed';

export interface Creature {
  name: string;
  xp: number;
  happiness: number; // 0-100
  hatchedAt: number | null; // epoch ms
  lastDecayCheck: string; // 'YYYY-MM-DD', local date
  pendingComeback: boolean; // true after an abandon, until next completed session
}

export interface ActiveSession {
  id: string;
  phase: ActivePhase;
  startedAt: number; // epoch ms
  endsAt: number; // recalculated after each pause
  pausedAt: number | null;
  pausedTotalMs: number;
  hiddenAt: number | null;
  lastSeenAt: number;
  labelId?: string; // V2
}

export interface SessionRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  focusMinutes: number;
  result: 'completed' | 'abandoned';
  abandonReason?: AbandonReason;
  labelId?: string; // V2
}

/** Light / dark mode; 'system' follows the OS setting. */
export type ThemePref = 'system' | 'light' | 'dark';

export type PresetId = 'classic' | 'deep' | 'marathon' | 'custom';

export interface Settings {
  // Custom preset lengths; other presets use the lengths in config.ts.
  focusMin: number; // 25
  shortBreakMin: number; // 5
  longBreakMin: number; // 15
  sessionsPerLongBreak: number; // 4
  graceSeconds: number; // 10
  soundOn: boolean;
  keepScreenOn: boolean; // Wake Lock
  autoStartBreaks: boolean; // true
  theme: ThemePref; // 'system' follows the OS
  presetId: PresetId; // V2
  lastLabelId: string | null; // V2
}

export interface Streak {
  current: number;
  best: number;
  lastCompletedDate: string | null;
}

export interface Label {
  id: string;
  name: string; // max 20 chars
  color: string; // one of 8 pastel tokens
  archived: boolean; // archived labels keep their history
}

export interface Wardrobe {
  color: FoxColor; // 'red' by default
  unlockedColors: FoxColor[];
  equipped: Accessory;
  unlockedAccessories: Accessory[];
  seenUnlocks: string[]; // so each unlock is celebrated once
}

export interface PersistedState {
  version: 3;
  creature: Creature | null; // null until onboarding is done
  active: ActiveSession | null;
  cycleCount: number; // completed focus sessions in the current cycle of 4
  pendingBreak: 'shortBreak' | 'longBreak' | null; // earned break not started yet
  history: SessionRecord[]; // keep the last 500
  streak: Streak;
  settings: Settings;
  labels: Label[]; // V2
  wardrobe: Wardrobe; // V2
  games: GameRecords; // V3: mini game high scores
}

// V2 visual types (used by the fox renderer; persisted in V2 wardrobe state).
export type FoxColor = 'red' | 'arctic' | 'silver' | 'midnight';
export type Accessory =
  'none' | 'glasses' | 'headphones' | 'beanie' | 'flowerCrown' | 'bowTie' | 'starCape';

// V3: mini games played outside focus sessions.
export type GameId = 'catch' | 'memory';

export interface GameRecord {
  /** Best score so far, or null before the first finished game. */
  best: number | null;
  /** Finished games. */
  plays: number;
}

export type GameRecords = Record<GameId, GameRecord>;
