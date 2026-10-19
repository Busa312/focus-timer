import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-fox text-white shadow-[0_6px_0_0_#d0703a] active:translate-y-[3px] active:shadow-[0_3px_0_0_#d0703a] hover:brightness-105',
  secondary:
    'bg-white text-ink shadow-[0_4px_0_0_rgba(59,42,36,0.12)] active:translate-y-[2px] active:shadow-[0_2px_0_0_rgba(59,42,36,0.12)] dark:bg-dusk dark:text-[#f3e9e2] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.35)]',
  ghost: 'bg-transparent text-ink/70 hover:bg-ink/5 dark:text-white/70 dark:hover:bg-white/5',
  danger: 'bg-rose-500 text-white shadow-[0_5px_0_0_#be123c] active:translate-y-[2px]',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`min-h-11 rounded-full px-6 py-2.5 text-base font-bold transition-[transform,box-shadow,filter] duration-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:opacity-50 motion-reduce:transition-none ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-3xl bg-white/80 p-4 shadow-[0_2px_0_0_rgba(59,42,36,0.06)] dark:bg-dusk/80 ${className}`}
    >
      {children}
    </section>
  );
}

interface ConfirmProps {
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal confirm with Cancel as the default (focused) button. */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-3xl bg-cream p-6 text-center shadow-xl dark:bg-dusk"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-lg font-bold">
          {title}
        </h2>
        {body && <p className="mt-2 text-sm opacity-75">{body}</p>}
        <div className="mt-6 flex flex-col gap-3">
          <Button ref={cancelRef} variant="primary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="ghost" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Small uppercase heading at the top of a card. */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-1 text-xs font-extrabold tracking-wider uppercase opacity-55">{children}</h2>
  );
}
