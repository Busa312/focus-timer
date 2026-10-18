# Focus Fox

A Pomodoro PWA where a little fox grows while you focus and gets sad (never dead) when you quit early. See [SPEC.md](SPEC.md) for the full design.

## Commands

```bash
npm install            # or `npm ci`; if adding packages fails on npm 10.8, use `npx npm@11 install <pkg>`
npm run dev            # dev server; open /?gallery to see every fox stage x mood, /?gallery&wardrobe&color=silver for accessories
npm test               # Vitest + Testing Library
npm run lint           # ESLint
npm run format         # Prettier
npm run build          # type-check + production build with service worker
npm run preview        # serve the production build
npm run generate-pwa-assets   # regenerate icons from public/icons/fox.svg
```

Dev-only fast mode (1 min focus, 10 s breaks) is in Settings when running `npm run dev`.

## Where things live

- `src/logic/` – pure game logic (timer, creature, leave detection, streaks, labels, unlocks, stats), fully unit tested. `engine.ts` is the session state machine.
- `src/config.ts` – every tunable number: XP thresholds, happiness changes, grace period, presets, unlock rules.
- `src/store/` – Zustand store persisted to IndexedDB (key `focus-creature`, kept from the working title so saved data stays put; version 2) and the V1 → V2 migration.
- `src/components/Creature/` – the fox: SVG per stage, CSS animations, accessories, color tokens, speech bubbles, and the Lottie hook-up.
- `src/assets/lottie/` – drop Lottie JSON files here to replace the CSS animations per state (see the README there).
- `src/pwa.ts` – service worker registration; updates never reload the page during a session.

## Deploying

No environment variables are needed: the app is fully client-side with no API keys or backend.

`npm run build` outputs a static site in `dist/`. Any static host works (Vercel, Netlify, GitHub Pages, Cloudflare Pages). The app must be served over HTTPS for the service worker, Wake Lock and sharing to work.
