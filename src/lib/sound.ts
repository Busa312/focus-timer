/**
 * Soft chime synthesized with Web Audio, so it works offline with no files.
 * Browsers only allow audio after a user gesture, so `unlockAudio` is called
 * from button taps (e.g. Start Focus) and the chime can play later.
 */
let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

export function unlockAudio(): void {
  const c = getContext();
  if (c?.state === 'suspended') void c.resume().catch(() => {});
}

export function playChime(): void {
  const c = getContext();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => {});
  const t0 = c.currentTime + 0.02;
  // E5, B5, E6: a gentle rising bell.
  [659.25, 987.77, 1318.51].forEach((freq, i) => {
    const start = t0 + i * 0.14;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.16, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.4);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + 1.5);
  });
}
