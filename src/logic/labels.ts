import { LABEL_COLORS, LABEL_NAME_MAX, MAX_ACTIVE_LABELS } from '../config';
import type { Label, PersistedState } from '../types';

export type LabelError = 'empty' | 'tooLong' | 'limit' | 'duplicate' | 'notFound';

export type LabelResult =
  { state: PersistedState; error: null } | { state: PersistedState; error: LabelError };

const ok = (state: PersistedState): LabelResult => ({ state, error: null });
const fail = (state: PersistedState, error: LabelError): LabelResult => ({ state, error });

export const activeLabels = (labels: readonly Label[]) => labels.filter((l) => !l.archived);

function validateName(labels: readonly Label[], raw: string, selfId?: string): LabelError | null {
  const name = raw.trim();
  if (!name) return 'empty';
  if (name.length > LABEL_NAME_MAX) return 'tooLong';
  const taken = labels.some(
    (l) => l.id !== selfId && !l.archived && l.name.toLowerCase() === name.toLowerCase(),
  );
  return taken ? 'duplicate' : null;
}

/** Next color not used by an active label, cycling through the 8 tokens. */
export function suggestColor(labels: readonly Label[]): string {
  const used = new Set(activeLabels(labels).map((l) => l.color));
  return (
    LABEL_COLORS.find((c) => !used.has(c)) ?? LABEL_COLORS[labels.length % LABEL_COLORS.length]
  );
}

export function addLabel(
  state: PersistedState,
  id: string,
  name: string,
  color: string,
): LabelResult {
  const err = validateName(state.labels, name);
  if (err) return fail(state, err);
  if (activeLabels(state.labels).length >= MAX_ACTIVE_LABELS) return fail(state, 'limit');
  const label: Label = { id, name: name.trim(), color, archived: false };
  return ok({ ...state, labels: [...state.labels, label] });
}

export function updateLabel(
  state: PersistedState,
  id: string,
  patch: Partial<Pick<Label, 'name' | 'color'>>,
): LabelResult {
  const current = state.labels.find((l) => l.id === id);
  if (!current) return fail(state, 'notFound');
  if (patch.name !== undefined) {
    const err = validateName(state.labels, patch.name, id);
    if (err) return fail(state, err);
  }
  const next = { ...current, ...patch, name: (patch.name ?? current.name).trim() };
  return ok({ ...state, labels: state.labels.map((l) => (l.id === id ? next : l)) });
}

/** Archive hides a label from the picker; its sessions stay in history and stats. */
export function setArchived(state: PersistedState, id: string, archived: boolean): LabelResult {
  const current = state.labels.find((l) => l.id === id);
  if (!current) return fail(state, 'notFound');
  if (current.archived === archived) return ok(state);
  if (!archived) {
    if (activeLabels(state.labels).length >= MAX_ACTIVE_LABELS) return fail(state, 'limit');
    const err = validateName(state.labels, current.name, id);
    if (err) return fail(state, err);
  }
  const labels = state.labels.map((l) => (l.id === id ? { ...l, archived } : l));
  const lastLabelId =
    archived && state.settings.lastLabelId === id ? null : state.settings.lastLabelId;
  return ok({ ...state, labels, settings: { ...state.settings, lastLabelId } });
}

/** The label a new focus session gets: the last used one, if still active. */
export function labelForNextSession(state: PersistedState): string | undefined {
  const id = state.settings.lastLabelId;
  return id && state.labels.some((l) => l.id === id && !l.archived) ? id : undefined;
}

export const LABEL_ERROR_TEXT: Record<LabelError, string> = {
  empty: 'Give it a name.',
  tooLong: `Keep it to ${LABEL_NAME_MAX} characters.`,
  limit: `You can have up to ${MAX_ACTIVE_LABELS} labels. Archive one first.`,
  duplicate: 'You already have a label with that name.',
  notFound: 'That label no longer exists.',
};
