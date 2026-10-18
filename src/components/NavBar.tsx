export type Screen = 'home' | 'stats' | 'wardrobe' | 'settings' | 'labels';

const ITEMS: { id: Screen; label: string; icon: string }[] = [
  {
    id: 'home',
    label: 'Fox',
    icon: 'M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z',
  },
  { id: 'stats', label: 'Stats', icon: 'M5 20V11M12 20V5M19 20v-6' },
  {
    id: 'wardrobe',
    label: 'Wardrobe',
    icon: 'M12 6a2 2 0 1 1 2-2M12 6v2M12 8 3 15a1 1 0 0 0 .6 1.8h16.8A1 1 0 0 0 21 15z',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z',
  },
];

export function NavBar({ screen, onChange }: { screen: Screen; onChange: (s: Screen) => void }) {
  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 mt-2 flex justify-around rounded-3xl bg-white/85 p-1.5 shadow-[0_-2px_12px_rgba(59,42,36,0.06)] backdrop-blur dark:bg-dusk/90"
    >
      {ITEMS.map((item) => {
        const current = item.id === screen || (screen === 'labels' && item.id === 'settings');
        return (
          <button
            key={item.id}
            type="button"
            aria-current={current ? 'page' : undefined}
            onClick={() => onChange(item.id)}
            className={`flex min-h-11 min-w-16 flex-col items-center justify-center rounded-2xl px-3 py-1 text-xs font-bold focus-visible:outline-3 focus-visible:outline-sky-500 ${
              current ? 'bg-peach/60 text-ink dark:bg-fox/25 dark:text-white' : 'opacity-60'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={item.icon} />
            </svg>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
