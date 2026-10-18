import type { CreatureState, Mood } from '../../types';

export type LineKey = Mood | Exclude<CreatureState, 'idle'>;

/** Small line pools per mood / state for the speech bubble. */
export const LINES: Record<LineKey, readonly string[]> = {
  ecstatic: ['best day ever!', "let's focus together!", 'I feel amazing!', 'you’re the best'],
  happy: ['ready when you are', 'one session?', 'hi friend!', 'what are we working on?'],
  meh: ['hmm...', 'a little bored', 'maybe one session?', '*yawn*'],
  sad: ['...you came back?', 'I missed you', 'one tiny session?', 'it’s a bit lonely'],
  focused: [
    "shh, we're working",
    'reading is fun',
    '*turns page*',
    "you've got this",
    'deep focus...',
  ],
  playing: ['break time!', 'catch!', 'wheee!', 'stretch those legs!', 'drink some water!'],
  celebrating: ['we did it!', 'yay!', 'so proud of us!', 'woohoo!'],
  disappointed: ['oh...', 'maybe next time', "that's okay", 'I’ll wait for you'],
  worried: ["where'd you go?", 'come back soon...', 'hello?'],
};

export function lineKeyFor(mood: Mood, state: CreatureState): LineKey {
  return state === 'idle' ? mood : state;
}

export function pickLine(key: LineKey, previous: string | null, rand: () => number = Math.random) {
  const pool = LINES[key];
  if (pool.length === 1) return pool[0];
  let line = pool[Math.floor(rand() * pool.length)];
  if (line === previous) line = pool[(pool.indexOf(line) + 1) % pool.length];
  return line;
}
