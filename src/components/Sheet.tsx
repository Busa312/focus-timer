import { useEffect, useRef, type ReactNode } from 'react';

/** Bottom sheet with a title; closes on backdrop tap or Escape. */
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
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[aria-checked="true"], button, input')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-pop max-h-[85dvh] w-full max-w-120 overflow-y-auto rounded-t-3xl bg-cream p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:bg-dusk"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink/15 dark:bg-white/20" />
        <h2 className="mb-3 text-lg font-extrabold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
