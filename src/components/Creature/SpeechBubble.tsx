import { useEffect, useRef, useState } from 'react';
import { pickLine, type LineKey } from './lines';

const SHOW_MS = 3_800;
const FIRST_DELAY_MS = 700;
const REPEAT_MIN_MS = 22_000;
const REPEAT_SPREAD_MS = 20_000;

interface Props {
  lineKey: LineKey;
  /** A one-off line that shows right away (e.g. "Phew, you're back!"). */
  override?: string | null;
}

/** Shows a line now and then: shortly after the state changes, then every ~30 s. */
export function SpeechBubble({ lineKey, override }: Props) {
  const [line, setLine] = useState<string | null>(null);
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (override) return;
    let hideId: number | undefined;
    let nextId: number | undefined;
    const show = () => {
      const l = pickLine(lineKey, last.current);
      last.current = l;
      setLine(l);
      hideId = window.setTimeout(() => setLine(null), SHOW_MS);
      nextId = window.setTimeout(show, REPEAT_MIN_MS + Math.random() * REPEAT_SPREAD_MS);
    };
    setLine(null);
    nextId = window.setTimeout(show, FIRST_DELAY_MS);
    return () => {
      window.clearTimeout(hideId);
      window.clearTimeout(nextId);
    };
  }, [lineKey, override]);

  const text = override ?? line;
  if (!text) return null;
  return (
    <div
      key={text}
      role="status"
      className="fox-bubble pointer-events-none absolute top-0 left-1/2 z-10 max-w-[80%] -translate-x-1/2 rounded-2xl bg-white px-3.5 py-2 text-center text-sm font-bold whitespace-nowrap text-ink shadow-[0_3px_0_rgba(59,42,36,0.08)] dark:bg-dusk dark:text-[#f3e9e2]"
    >
      {text}
      <span
        aria-hidden="true"
        className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white dark:bg-dusk"
      />
    </div>
  );
}
