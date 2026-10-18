import { LABEL_COLORS } from '../config';
import type { PersistedState } from '../types';
import * as engine from './engine';
import { addLabel, labelForNextSession, setArchived, suggestColor, updateLabel } from './labels';

const T0 = new Date(2026, 9, 19, 9, 0).getTime();
const base = () => engine.onboard(engine.initialState(), 'Pip', T0);

function withLabels(names: string[]): PersistedState {
  let s = base();
  names.forEach((n, i) => {
    s = addLabel(s, `l${i}`, n, LABEL_COLORS[i % 8]).state;
  });
  return s;
}

describe('labels', () => {
  it('adds a trimmed label', () => {
    const r = addLabel(base(), 'a', '  Study ', LABEL_COLORS[0]);
    expect(r.error).toBeNull();
    expect(r.state.labels).toEqual([
      { id: 'a', name: 'Study', color: LABEL_COLORS[0], archived: false },
    ]);
  });

  it('validates names', () => {
    expect(addLabel(base(), 'a', '   ', LABEL_COLORS[0]).error).toBe('empty');
    expect(addLabel(base(), 'a', 'x'.repeat(21), LABEL_COLORS[0]).error).toBe('tooLong');
    expect(addLabel(base(), 'a', 'x'.repeat(20), LABEL_COLORS[0]).error).toBeNull();
    expect(addLabel(withLabels(['Study']), 'b', 'study', LABEL_COLORS[1]).error).toBe('duplicate');
  });

  it('allows at most 12 active labels', () => {
    const s = withLabels(Array.from({ length: 12 }, (_, i) => `L${i}`));
    expect(addLabel(s, 'x', 'One more', LABEL_COLORS[0]).error).toBe('limit');
    const archived = setArchived(s, 'l0', true).state;
    expect(addLabel(archived, 'x', 'One more', LABEL_COLORS[0]).error).toBeNull();
    // Restoring would exceed the limit again.
    const full = addLabel(archived, 'x', 'One more', LABEL_COLORS[0]).state;
    expect(setArchived(full, 'l0', false).error).toBe('limit');
  });

  it('renames and recolors', () => {
    let s = withLabels(['Study', 'Work']);
    s = updateLabel(s, 'l0', { name: 'Reading', color: LABEL_COLORS[5] }).state;
    expect(s.labels[0]).toMatchObject({ name: 'Reading', color: LABEL_COLORS[5] });
    expect(updateLabel(s, 'l0', { name: 'work' }).error).toBe('duplicate');
    expect(updateLabel(s, 'nope', { name: 'X' }).error).toBe('notFound');
  });

  it('archiving deselects the label but keeps it', () => {
    let s = withLabels(['Study']);
    s = { ...s, settings: { ...s.settings, lastLabelId: 'l0' } };
    s = setArchived(s, 'l0', true).state;
    expect(s.labels[0].archived).toBe(true);
    expect(s.settings.lastLabelId).toBeNull();
  });

  it('suggests an unused color', () => {
    expect(suggestColor(withLabels(['A', 'B']).labels)).toBe(LABEL_COLORS[2]);
  });

  it('uses the last label for the next session only while it is active', () => {
    let s = withLabels(['Study']);
    expect(labelForNextSession(s)).toBeUndefined();
    s = { ...s, settings: { ...s.settings, lastLabelId: 'l0' } };
    expect(labelForNextSession(s)).toBe('l0');
    s = { ...s, labels: [{ ...s.labels[0], archived: true }] };
    expect(labelForNextSession(s)).toBeUndefined();
  });
});

describe('engine: labels on sessions', () => {
  it('saves the label on the active session and on the completed record', () => {
    let s = withLabels(['Study']);
    s = { ...s, settings: { ...s.settings, lastLabelId: 'l0' } };
    s = engine.startFocus(s, T0, 'f');
    expect(s.active!.labelId).toBe('l0');
    const out = engine.tick(s, T0 + 25 * 60_000).state;
    expect(out.history[0]).toMatchObject({ result: 'completed', labelId: 'l0' });
  });

  it('saves the label on abandoned records too', () => {
    let s = withLabels(['Study']);
    s = { ...s, settings: { ...s.settings, lastLabelId: 'l0' } };
    s = engine.startFocus(s, T0, 'f');
    expect(engine.abandonFocus(s, T0 + 60_000, 'gaveUp').state.history[0].labelId).toBe('l0');
  });

  it('records no label when none is picked', () => {
    const s = engine.startFocus(withLabels(['Study']), T0, 'f');
    expect(s.active!.labelId).toBeUndefined();
    expect('labelId' in engine.tick(s, T0 + 25 * 60_000).state.history[0]).toBe(false);
  });
});
