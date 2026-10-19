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

export type GameSound = 'berry' | 'golden' | 'pinecone' | 'flip' | 'match' | 'win';

/** Note sequences: [frequency Hz, start offset s, duration s, wave]. */
const GAME_SOUNDS: Record<GameSound, [number, number, number, OscillatorType][]> = {
  berry: [[880, 0, 0.12, 'sine']],
  golden: [
    [1046.5, 0, 0.14, 'sine'],
    [1318.5, 0.07, 0.14, 'sine'],
    [1568, 0.14, 0.22, 'sine'],
  ],
  pinecone: [[160, 0, 0.18, 'triangle']],
  flip: [[620, 0, 0.05, 'sine']],
  match: [
    [784, 0, 0.14, 'sine'],
    [1046.5, 0.09, 0.22, 'sine'],
  ],
  win: [],
};

/** Short, quiet game sounds. Callers check the Sound setting. */
export function playGameSound(sound: GameSound): void {
  if (sound === 'win') return playChime();
  const c = getContext();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => {});
  const t0 = c.currentTime + 0.01;
  for (const [freq, offset, dur, type] of GAME_SOUNDS[sound]) {
    const start = t0 + offset;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    // A tiny upward glide makes pops feel bouncy; the pinecone "bonk" glides down.
    osc.frequency.exponentialRampToValueAtTime(
      sound === 'pinecone' ? freq * 0.7 : freq * 1.25,
      start + dur,
    );
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(sound === 'pinecone' ? 0.14 : 0.08, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }
}
