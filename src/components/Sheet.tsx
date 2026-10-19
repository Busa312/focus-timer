import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

/** Pull further than this, or flick faster, to close. */
const CLOSE_DISTANCE = 90;
const CLOSE_VELOCITY = 0.5; // px per ms
const OUT_MS = 220;

/**
 * Bottom sheet with a title. Closes on swipe down (from the handle / title),
 * tapping the handle, the backdrop, or Escape.
 */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [closing, setClosing] = useState(false);
  const start = useRef<{ y: number; t: number; moved: boolean } | null>(null);

  const close = useCallback(() => {
    if (reduced) return onClose();
    setClosing(true);
    window.setTimeout(onClose, OUT_MS);
  }, [onClose, reduced]);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[aria-checked="true"], [data-autofocus]')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    start.current = { y: e.clientY, t: performance.now(), moved: false };
    setDragging(true);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    const dy = Math.max(0, e.clientY - start.current.y);
    if (dy > 4) start.current.moved = true;
    setDragY(dy);
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    setDragging(false);
    if (!s) return;
    const dy = Math.max(0, e.clientY - s.y);
    const velocity = dy / Math.max(1, performance.now() - s.t);
    if (dy > CLOSE_DISTANCE || (velocity > CLOSE_VELOCITY && dy > 20)) {
      close();
    } else {
      setDragY(0);
    }
    // Keep `moved` for the click that follows, so a drag isn't also a tap.
    window.setTimeout(() => (start.current = null), 0);
  };

  const offset = closing ? '100%' : `${dragY}px`;
  const fade = closing ? 0 : Math.max(0, 1 - dragY / 400);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={close}
      data-testid="sheet-backdrop"
    >
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-ink/40 ${dragging ? '' : 'transition-opacity duration-200'}`}
        style={{ opacity: fade }}
      />
      {/* The drag moves this wrapper; the panel inside keeps its entrance animation. */}
      <div
        className={`relative w-full max-w-120 ${dragging ? '' : 'transition-transform duration-200 ease-out motion-reduce:transition-none'}`}
        style={{ transform: `translateY(${offset})` }}
      >
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="animate-sheet-in max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-cream px-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:bg-dusk"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="-mx-4 cursor-grab touch-none px-4 pt-2 select-none active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            data-testid="sheet-drag"
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => !start.current?.moved && close()}
              className="mx-auto flex h-6 w-16 items-center justify-center rounded-full focus-visible:outline-3 focus-visible:outline-sky-500"
            >
              <span className="h-1.5 w-10 rounded-full bg-ink/20 dark:bg-white/25" />
            </button>
            <h2 className="pt-1 pb-3 text-lg font-extrabold">{title}</h2>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
