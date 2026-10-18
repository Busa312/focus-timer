export function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="flex items-center gap-1 pt-2">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-ink/5 focus-visible:outline-3 focus-visible:outline-sky-500 dark:hover:bg-white/5"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
      <h1 className="text-2xl font-extrabold">{title}</h1>
    </header>
  );
}
