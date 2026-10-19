import { del, get, set as idbSet } from 'idb-keyval';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import {
  DEFAULT_GAME_RECORDS,
  DEFAULT_SETTINGS,
  DEFAULT_WARDROBE,
  PERSIST_KEY,
  PERSIST_VERSION,
} from '../config';
import * as engine from '../logic/engine';
import type { GameEvent, Outcome } from '../logic/engine';
import * as labels from '../logic/labels';
import type { LabelError } from '../logic/labels';
import * as unlocks from '../logic/unlocks';
import type { UnlockId } from '../logic/unlocks';
import type { Accessory, FoxColor, GameId, PersistedState, Settings } from '../types';
import { recordScore } from '../logic/games';
import { migrate } from './migrations';

const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: (name, value) => idbSet(name, value),
  removeItem: (name) => del(name),
};

export interface AppStore extends PersistedState {
  /** True once saved data has loaded from IndexedDB. */
  hydrated: boolean;
  /** Most recent outcome for the UI (celebration, disappointment, relief). */
  event: GameEvent | null;

  onboard: (name: string) => void;
  startFocus: () => void;
  pause: () => void;
  resume: () => void;
  giveUp: () => void;
  complete: () => void;
  startBreak: () => void;
  skipBreak: () => void;
  handleHidden: () => void;
  handleVisible: () => void;
  heartbeat: () => void;
  tick: () => void;
  startup: () => void;
  dismissEvent: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Picks the label for the next focus session (null = no label). */
  selectLabel: (id: string | null) => void;
  addLabel: (name: string, color: string) => LabelError | null;
  updateLabel: (id: string, patch: { name?: string; color?: string }) => LabelError | null;
  setLabelArchived: (id: string, archived: boolean) => LabelError | null;
  equipAccessory: (a: Accessory) => void;
  setFoxColor: (c: FoxColor) => void;
  markUnlockSeen: (uid: UnlockId) => void;
  /** Saves a finished mini game; returns true for a new high score. */
  recordGameScore: (game: GameId, score: number) => boolean;
  resetAll: () => void;
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function pickPersisted(s: AppStore): PersistedState {
  return {
    version: s.version,
    creature: s.creature,
    active: s.active,
    cycleCount: s.cycleCount,
    pendingBreak: s.pendingBreak,
    history: s.history,
    streak: s.streak,
    settings: s.settings,
    labels: s.labels,
    wardrobe: s.wardrobe,
    games: s.games,
  };
}

export function createAppStore(now: () => number = () => Date.now()) {
  const store = create<AppStore>()(
    persist(
      (set, getState) => {
        /** Apply a pure state transition. */
        const apply = (fn: (s: PersistedState) => PersistedState) => {
          const prev = pickPersisted(getState());
          const next = fn(prev);
          if (next !== prev) set(next);
        };
        /** Apply a label operation; returns its error, if any. */
        const label = (fn: (s: PersistedState) => labels.LabelResult) => {
          const { state, error } = fn(pickPersisted(getState()));
          if (!error) set(state);
          return error;
        };
        /** Apply a transition that may emit events; the last event wins. */
        const run = (fn: (s: PersistedState) => Outcome) => {
          const prev = pickPersisted(getState());
          const { state, events } = fn(prev);
          const patch: Partial<AppStore> = state !== prev ? state : {};
          if (events.length > 0) patch.event = events[events.length - 1];
          if (Object.keys(patch).length > 0) set(patch);
        };

        return {
          ...engine.initialState(),
          hydrated: false,
          event: null,

          onboard: (name) => apply((s) => engine.onboard(s, name, now())),
          startFocus: () => {
            apply((s) => engine.startFocus(s, now(), newId()));
            set({ event: null });
          },
          pause: () => apply((s) => engine.pause(s, now())),
          resume: () => apply((s) => engine.resume(s, now())),
          giveUp: () => run((s) => engine.abandonFocus(s, now(), 'gaveUp')),
          complete: () => run((s) => engine.completeFocus(s, now())),
          startBreak: () => apply((s) => engine.startBreak(s, now(), newId())),
          skipBreak: () => apply((s) => engine.skipBreak(s)),
          handleHidden: () => apply((s) => engine.markHidden(s, now())),
          handleVisible: () => run((s) => engine.markVisible(s, now())),
          heartbeat: () => apply((s) => engine.heartbeat(s, now())),
          tick: () => run((s) => engine.tick(s, now())),
          startup: () => run((s) => engine.onStartup(s, now())),
          dismissEvent: () => set({ event: null }),
          updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
          selectLabel: (id) => set((s) => ({ settings: { ...s.settings, lastLabelId: id } })),
          addLabel: (name, color) => label((s) => labels.addLabel(s, newId(), name, color)),
          updateLabel: (id, patch) => label((s) => labels.updateLabel(s, id, patch)),
          setLabelArchived: (id, archived) => label((s) => labels.setArchived(s, id, archived)),
          equipAccessory: (a) => set((s) => ({ wardrobe: unlocks.equip(s.wardrobe, a) })),
          setFoxColor: (c) => set((s) => ({ wardrobe: unlocks.setColor(s.wardrobe, c) })),
          markUnlockSeen: (uid) => set((s) => ({ wardrobe: unlocks.markSeen(s.wardrobe, uid) })),
          recordGameScore: (game, score) => {
            const r = recordScore(getState().games, game, score);
            set({ games: r.records });
            return r.isNewBest;
          },
          resetAll: () => set({ ...engine.initialState(), event: null }),
        };
      },
      {
        name: PERSIST_KEY,
        version: PERSIST_VERSION,
        storage: createJSONStorage(() => idbStorage),
        partialize: pickPersisted,
        migrate: (persisted, version) => migrate(persisted, version) as AppStore,
        merge: (persisted, current) => {
          const p = (persisted ?? {}) as Partial<PersistedState>;
          return {
            ...current,
            ...p,
            settings: { ...DEFAULT_SETTINGS, ...p.settings },
            wardrobe: { ...DEFAULT_WARDROBE, ...p.wardrobe },
            games: { ...DEFAULT_GAME_RECORDS, ...p.games },
          };
        },
        onRehydrateStorage: () => () => {
          store.setState({ hydrated: true });
          store.getState().startup();
        },
      },
    ),
  );
  return store;
}

export const useAppStore = createAppStore();
export type AppStoreApi = ReturnType<typeof createAppStore>;
