import { initialState } from './logic/engine';
import { isIdleForUpdate, reloadWhenIdle } from './pwa';
import { useAppStore } from './store/useAppStore';

describe('update-safe reloads', () => {
  beforeEach(() => {
    useAppStore.setState({ ...initialState(), event: null });
    useAppStore.getState().onboard('Pip');
  });

  it('is idle only with no session, no pending break and no overlay', () => {
    const s = useAppStore.getState();
    expect(isIdleForUpdate(s)).toBe(true);
    expect(isIdleForUpdate({ ...s, pendingBreak: 'shortBreak' })).toBe(false);
    expect(isIdleForUpdate({ ...s, event: { type: 'relief', at: 0 } })).toBe(false);
  });

  it('reloads right away when idle', () => {
    const reload = vi.fn();
    reloadWhenIdle(reload);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('never reloads during a focus session; waits for the next idle moment', () => {
    useAppStore.getState().startFocus();
    const reload = vi.fn();
    reloadWhenIdle(reload);
    useAppStore.getState().pause();
    useAppStore.getState().resume();
    expect(reload).not.toHaveBeenCalled();

    // Session ends -> celebration + pending break: still not idle.
    useAppStore.setState((s) => ({ active: { ...s.active!, endsAt: Date.now() - 1 } }));
    useAppStore.getState().tick();
    expect(reload).not.toHaveBeenCalled();
    useAppStore.getState().dismissEvent();
    expect(reload).not.toHaveBeenCalled();

    useAppStore.getState().skipBreak();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
