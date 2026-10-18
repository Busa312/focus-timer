/** One-time UI tips. Stored in localStorage: losing them only means a tip shows again. */
const PREFIX = 'focus-creature:tip:';

export function tipSeen(id: string): boolean {
  try {
    return localStorage.getItem(PREFIX + id) === '1';
  } catch {
    return false;
  }
}

export function markTipSeen(id: string): void {
  try {
    localStorage.setItem(PREFIX + id, '1');
  } catch {
    // Private mode: the tip may show again; that's fine.
  }
}
