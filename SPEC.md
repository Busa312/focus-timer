# Focus Creature — PWA Build Spec

Oct 19, 2026 · @Busa

## Overview

Focus Creature is an installable PWA, built with React + Vite, where a small creature grows as you complete Pomodoro focus sessions and gets sad when you quit early.

The core loop:

1. The user taps **Start Focus** (25 min default).
2. The creature works alongside them (reading, nibbling, napping) while the timer runs.
3. **Session completed:** the creature gains XP and happiness, then a 5 min break starts where it plays.
4. **User leaves the app or gives up:** after a short grace period the session is abandoned and the creature gets sad. It never dies and never loses XP.
5. Every 4th completed session earns a long break (15 min) and a bonus treat.

Design principle: **sad, never dead.** Failure should nudge, not punish, so users come back after a bad day.

**How to use this spec with Claude Code:** save it as `SPEC.md` in the project root and ask Claude Code to build it milestone by milestone (see Build milestones). Anything marked as a default in Open decisions can be changed before building.

## Open decisions

Every choice below has a default this spec already assumes; change any row before handing the spec to Claude Code.

| # | Decision | Default in this spec | Other options |
| --- | --- | --- | --- |
| 1 | App name | Focus Creature (working title) | Your own name |
| 2 | Creature type | fox | Cat or dog, baby dragon |
| 3 | Art approach | SVG drawn in code, Lottie animations | Emoji, pixel-art PNG sprites |
| 4 | Visual style | Soft pastel, rounded, light + dark mode | Retro pixel, cozy dark-only, minimal mono |
| 5 | Leave strictness | 10 s grace period, then abandoned | Strict (0 s), lenient (30 s), honor system (give-up button only) |
| 6 | Timer lengths | 25 / 5 / 15 min, long break every 4 sessions | 50 / 10, user-set in V1 |
| 7 | First build scope | V1 + V2 | Version 1 only |
| 8 | Styling | Tailwind CSS | CSS Modules, plain CSS |
| 9 | Language | TypeScript | JavaScript |
| 10 | Sound | Soft chime at session end, toggle in settings | No sound in V1 |
| 11 | Hosting | Vercel (free tier) | Netlify, GitHub Pages, Cloudflare Pages |
| 12 | Locking the phone | Counts as leaving; screen kept on with Wake Lock | Ask on return "locked or used other apps?" (honor system) |

## Tech stack

The app is fully client-side in V1: no backend, no accounts, all data on the device.

| Concern | Choice | Why |
| --- | --- | --- |
| Build tool | Vite, React template | Fast dev server, simple config |
| UI | React + TypeScript | Typed state makes the timer and creature logic safer |
| PWA | `vite-plugin-pwa` (Workbox, `generateSW`, `registerType: 'autoUpdate'`) | Generates manifest + service worker |
| State | Zustand with `persist` middleware | Small, no boilerplate, easy persistence |
| Storage | IndexedDB via `idb-keyval` as the Zustand storage adapter | Survives reloads, larger and sturdier than localStorage |
| Styling | Tailwind CSS | Quick, consistent styling |
| Animation | Lottie via \`lottie-react\` for creature animations, CSS keyframes for small touches | Rich, smooth animations from small JSON files that cache offline |
| Testing | Vitest + React Testing Library | Native to Vite |
| Quality | ESLint + Prettier | Consistent code |
| Share image (V2) | html-to-image + Web Share API | Turns the summary card into a PNG and opens the phone's share sheet |

Use the latest stable versions of each package. Avoid any library that needs a server.

## Build scope

The first build covers V1 (the core loop) and V2 (labels, presets, wardrobe, sharing); build V1 completely first, then add V2 on top.

**V1, the core:**

- Focus / short break / long break cycle with start, pause, resume, give up and skip break
- One fox with 5 growth stages and 4 moods
- XP, happiness, total sessions and current streak, saved on device
- Leave detection with a 10 s grace period
- First-run onboarding: hatch the egg and name the fox
- Stats screen and settings screen
- Installable PWA that works fully offline

**V2, built on top:**

- **Task labels:** the user creates up to 12 labels (name + color), picks one before Start Focus (optional, last used preselected), and Stats shows focus minutes per label for the last 7 and 30 days.
- **Timer presets:** Classic 25/5/15, Deep 50/10/20, Marathon 90/20/30, plus Custom. XP stays equal to focus minutes, so longer sessions grow the fox faster.
- **Fox colors and accessories:** unlocked at milestones (see the unlock table in Screens and UI) and equipped in a Wardrobe screen, one accessory at a time.
- **Weekly summary card:** a shareable image with the fox, total focus time, sessions, streak and top label.

**Not in this build:**

- Accounts, sync, friends or any backend
- Push notifications while the app is closed
- Evolution branches and food items
- Blocking other apps

## Timer and session logic

The timer is a small state machine, and remaining time is always computed from saved timestamps, never from a counting interval.

&#91;embedded content: timer states · 7 states, 11 transitions\]

Every focus session ends either completed (rewards) or abandoned (penalty); breaks always lead back to Idle, and the next focus session starts with a tap.

**Timing rules:**

- Remaining time = `endsAt - now` (while paused: `endsAt - pausedAt`). On resume, push `endsAt` forward by the paused duration and add it to `pausedTotalMs`.
- A `useTicker` hook re-renders about 4 times per second, only while the page is visible, to update the display. Outcome checks run on each tick, on every visibility change and on app start.
- When `now >= endsAt` during focus: mark it completed, apply rewards, add 1 to `cycleCount`, play the chime, then start a short break, or a long break when `cycleCount` reaches `sessionsPerLongBreak` (then reset it to 0).
- Breaks end on time or with "Skip break" and return to Idle. Breaks auto-start by default (`autoStartBreaks`).
- Abandoned sessions do not advance `cycleCount`.
- Only one active session can exist at a time.

## Creature system

The creature grows from XP (never lost) and shows feelings from happiness (goes up and down). Early stages come fast so day one feels rewarding.

### Growth stages

A completed focus session earns XP equal to its focus minutes (25 XP at default settings). Abandoned sessions earn 0 XP.

| Stage | XP needed | About how many 25 min sessions | Look |
| --- | --- | --- | --- |
| Egg | 0 | 0 | Speckled egg that wobbles |
| Baby | 25 | 1 | Fox kit, oversized ears and eyes |
| Kid | 125 | 5 | Bigger, fluffy tail appears |
| Teen | 375 | 15 | Longer legs, white tail tip, more expressive |
| Adult | 1000 | 40 | Full-size fox with a signature scarf |

The egg hatches with a short animation at the end of the first completed session. After Adult, XP keeps counting as a level number (Level = floor(XP / 250)) for bragging rights.

### Happiness rules

Happiness runs 0 to 100 and starts at 70.

| Event | Change |
| --- | --- |
| Focus session completed | +10 |
| Every 4th completed session (long break earned) | +5 extra, plus a treat animation |
| First completed session after an abandon | +5 extra (comeback bonus) |
| Session abandoned (gave up or left past grace) | -15 |
| Each full calendar day with no completed session | -5, applied when the app next opens |

Clamp to 0 to 100 after every change. Keep all numbers in one `config.ts` so they are easy to tune.

### Moods

| Happiness | Mood | Face and motion |
| --- | --- | --- |
| 80–100 | Ecstatic | Sparkly eyes, bouncy idle, occasional hearts |
| 50–79 | Happy | Smile, gentle bob |
| 25–49 | Meh | Flat mouth, slow bob |
| 0–24 | Sad | Droopy eyes, frown, slumped, rain-cloud puff now and then |

Short-lived states override the mood face: **Focused** during a focus session (reading or concentrating), **Playing** during breaks, **Celebrating** for 4 s after a completed session, **Disappointed** for 4 s after an abandon, and **Worried** during the grace period.

### Streak

A streak is the number of consecutive calendar days (device local time) with at least one completed focus session. Missing a day resets it to 0.

### Visuals and personality

- The creature is a fox. One `<Creature stage mood state />` React component decides what to show.
- **SVG drawn in code** for the static base of each stage: body, face, ears, tail as separate groups, so faces can swap instantly and it looks sharp at any size.
- **Lottie animations** (JSON files in `src/assets/lottie/`) for motion: idle, blink, focused, playing, celebrating, disappointed, worried, sad, and the egg hatching. Play with `lottie-react`; loop idle states, play event states once.
- Until real Lottie files exist, Claude Code should build the SVG version with CSS keyframe animations as a fallback, behind the same component API, so Lottie files can be dropped in later without other changes. Free fox animations can come from LottieFiles, or be made in a tool like After Effects + Bodymovin or LottieCreator.
- Show a speech bubble now and then, picked from a small line pool per state (for example Focused: "shh, we're working", Sad: "...you came back?").
- Respect `prefers-reduced-motion`: pause Lottie on its first frame and replace movement with simple fades.

## Leave detection

A focus session is abandoned when the app stays hidden longer than the grace period (10 s default); all checks use saved timestamps because the browser may freeze JavaScript while the app is hidden.

### How it works

1. Listen to `document.visibilitychange`. When the page becomes hidden during a running focus session, save `hiddenAt = Date.now()` and switch the creature to **Worried**.
2. When the page becomes visible again, compute `away = now - hiddenAt`.
3. If `away <= GRACE_MS`, resume with no penalty. Show a relief line ("phew, you're back").
4. If `away > GRACE_MS`, mark the session abandoned, apply the abandon penalty, and show the **Disappointed** animation plus a gentle message.
5. Never rely on `setTimeout` firing while hidden. The decision is always made on return.

### Keeping the phone on the desk

Locking the screen also hides the page, and a PWA cannot tell a screen lock apart from switching apps. In V1, the app requests a **Screen Wake Lock** during focus sessions so the screen stays on with the creature visible, and any hide (including a manual lock) counts as leaving. Wake Lock is released on pause, break and session end, and re-requested when the page becomes visible again. If the browser lacks Wake Lock, show a one-time tip: "keep this screen open while you focus."

### Edge cases

- **App killed or reloaded mid-session:** while visible, save `lastSeenAt` every 5 s. On startup, if a running session exists and `now - lastSeenAt > GRACE_MS`, abandon it; otherwise resume it.
- **Timer ends while hidden:** if `hiddenAt >= endsAt`, the session was already complete, so count it as completed. If the user left before `endsAt` but returns within the grace period, also count it as completed.
- **Paused sessions:** leaving while paused is allowed and has no penalty. Pausing is unlimited in V1 (honor system); keep `MAX_PAUSES` in config so it can be limited later.
- **Breaks:** leaving during a break is always fine.
- **Desktop:** switching browser tabs or minimizing counts as leaving; clicking another window while the tab stays visible does not.
- **Optional, best effort:** if notification permission was granted, show a local notification on hide ("come back in 10 s or your creature gets sad"). It may not appear on every platform, so nothing depends on it.

## Data model and persistence

All state lives in one Zustand store persisted to IndexedDB under the key `focus-creature`, with a `version` number for future migrations.

```ts
type Stage = 'egg' | 'baby' | 'kid' | 'teen' | 'adult';
type Mood = 'ecstatic' | 'happy' | 'meh' | 'sad';
type Phase = 'idle' | 'focus' | 'shortBreak' | 'longBreak';

interface Creature {
  name: string;
  xp: number;
  happiness: number;        // 0-100
  hatchedAt: number | null; // epoch ms
  lastDecayCheck: string;   // 'YYYY-MM-DD', local date
  pendingComeback: boolean; // true after an abandon, until next completed session
}

interface ActiveSession {
  id: string;
  phase: Phase;
  startedAt: number;        // epoch ms
  endsAt: number;           // recalculated after each pause
  pausedAt: number | null;
  pausedTotalMs: number;
  hiddenAt: number | null;
  lastSeenAt: number;
}

interface SessionRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  focusMinutes: number;
  result: 'completed' | 'abandoned';
  abandonReason?: 'gaveUp' | 'leftApp' | 'appClosed';
}

interface Settings {
  focusMin: number;         // 25
  shortBreakMin: number;    // 5
  longBreakMin: number;     // 15
  sessionsPerLongBreak: number; // 4
  graceSeconds: number;     // 10
  soundOn: boolean;
  keepScreenOn: boolean;    // Wake Lock
  autoStartBreaks: boolean; // true
}

interface PersistedState {
  version: 1;
  creature: Creature | null; // null until onboarding is done
  active: ActiveSession | null;
  cycleCount: number;        // completed focus sessions in the current cycle of 4
  history: SessionRecord[];  // keep the last 500
  streak: { current: number; best: number; lastCompletedDate: string | null };
  settings: Settings;
}
```

**V2 additions** (bump the persisted `version` to 2 and migrate V1 data by filling these defaults):

```ts
interface Label {
  id: string;
  name: string;             // max 20 chars
  color: string;            // one of 8 pastel tokens
  archived: boolean;        // archived labels keep their history
}

type PresetId = 'classic' | 'deep' | 'marathon' | 'custom';

type FoxColor = 'red' | 'arctic' | 'silver' | 'midnight';
type Accessory = 'none' | 'glasses' | 'headphones' | 'beanie' | 'flowerCrown' | 'bowTie' | 'starCape';

interface Wardrobe {
  color: FoxColor;                  // 'red' by default
  unlockedColors: FoxColor[];
  equipped: Accessory;
  unlockedAccessories: Accessory[];
  seenUnlocks: string[];            // so each unlock is celebrated once
}

// SessionRecord gains:   labelId?: string
// ActiveSession gains:   labelId?: string
// Settings gains:        presetId: PresetId; lastLabelId: string | null
// PersistedState gains:  labels: Label[]; wardrobe: Wardrobe
```

Stage and mood are always derived from `xp` and `happiness`, never stored. All tunable numbers (XP thresholds, happiness changes, grace, decay) live in `src/config.ts`.

## Screens and UI

V1 has one main screen plus three small ones, designed mobile-first (360 px wide) and centered on desktop with a max width of 480 px.

| Screen | What it shows | Actions |
| --- | --- | --- |
| Onboarding (first run only) | The egg, a short intro ("focus to help it grow"), a name field | Name it, then "Let's start" |
| Home / Timer | Creature (top 60%), name + stage + happiness bar, big countdown ring, phase label, session dots (e.g. 2 of 4) | Start Focus, Pause/Resume, Give up (with confirm), Skip break |
| Stats | Total focus time, completed vs abandoned, current and best streak, XP to next stage, last 7 days as simple bars | Back |
| Settings | Timer lengths, grace seconds, sound, keep screen on, auto-start breaks, reset all data (with confirm) | Save, Back |

**Home screen details:**

- The countdown ring drains during focus and fills during breaks. Show minutes and seconds in large tabular numbers.
- "Give up" asks "Give up? Your fox will be sad" with Cancel as the default button.
- After a completed session, show a celebration overlay with +XP and +happiness for 3 s, then start the break (if auto-start is on).
- On a stage-up, show a full-screen evolution moment before the break.
- The page title shows the countdown ("18:42 · Focus") so desktop users see it in the tab.

Navigation is a simple bottom bar or top icons; no router library is needed, a `screen` state value is enough. All buttons need visible focus styles and 44 px minimum touch targets.

### V2 screens and additions

| Where | What it adds |
| --- | --- |
| Home | A label chip above Start Focus (tap to pick, "No label" allowed) and a preset chip (Classic / Deep / Marathon / Custom). Both are locked during a session. |
| Labels (from Settings) | Create, rename, recolor and archive labels; max 12 active. |
| Stats | A per-label breakdown for the last 7 and 30 days as horizontal bars, plus a "Share this week" button. |
| Wardrobe (new tab) | The fox large in the middle, color swatches and accessory tiles below; locked items show a padlock and how to earn them. |
| Unlock moment | When something unlocks, a small celebration overlay after the session ("New: headphones!") with an "Equip now" button. |
| Share card | A 1080 × 1350 px image: fox in its current color and accessory, total focus time this week, sessions, streak, top label. |

**Unlocks** (all thresholds live in `config.ts`):

| Item | Type | How to earn |
| --- | --- | --- |
| Glasses | Accessory | 10 completed sessions |
| Arctic white | Color | Reach Kid stage |
| Headphones | Accessory | 7-day streak |
| Beanie | Accessory | 25 completed sessions |
| Silver | Color | Reach Teen stage |
| Flower crown | Accessory | 10 hours total focus |
| Bow tie | Accessory | 50 completed sessions |
| Midnight | Color | Reach Adult stage |
| Star cape | Accessory | 30-day streak |

Accessories are separate SVG layers drawn on top of the fox, positioned per stage, so each one works on every stage and color. Colors swap the fox's fill tokens. With Lottie, colors and accessories are harder: either build them as named layers inside each Lottie file and toggle them, or keep the SVG fox for Wardrobe and the share card. The share card is rendered from a hidden DOM node with `html-to-image`, then shared with the Web Share API (`navigator.share` with a file) or downloaded as a PNG where sharing files is not supported.

## PWA requirements

The app must install to the home screen on Android, iOS and desktop Chrome/Edge, and work fully offline after the first visit.

- **Manifest** (via `vite-plugin-pwa`): `name` and `short_name` from decision 1, `display: "standalone"`, `orientation: "portrait"`, `start_url: "/"`, `theme_color` and `background_color` matching the palette.
- **Icons:** 192 px and 512 px PNG, plus a 512 px maskable icon and a 180 px `apple-touch-icon`. Generate them from one source SVG of the fox face with `@vite-pwa/assets-generator`.
- **iOS meta tags:** `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, and a title.
- **Service worker:** precache all built assets, Lottie JSON files and sounds. No runtime network calls are needed.
- **Updates:** `registerType: 'autoUpdate'`, but never reload during an active focus session; apply the update on the next idle moment.
- **Install prompt:** on Android/desktop, capture `beforeinstallprompt` and show a small "Install app" button in Settings. On iOS, show a one-time tip: Share → Add to Home Screen.
- **Safe areas:** use `viewport-fit=cover` and `env(safe-area-inset-*)` padding so nothing hides under notches or home bars.
- **Lighthouse:** the PWA should pass the installability checks.

## Project structure

Game logic stays in plain TypeScript functions with no React, so it can be unit tested on its own.

```text
focus-creature/
├── SPEC.md                    # this document
├── index.html
├── vite.config.ts             # React + vite-plugin-pwa config
├── public/
│   ├── icons/                 # generated PWA icons
│   └── sounds/chime.mp3
└── src/
    ├── main.tsx
    ├── App.tsx                # screen switching
    ├── config.ts              # all tunable numbers, presets, unlock rules
    ├── logic/                 # pure functions, fully tested
    │   ├── timer.ts           # remaining time, phase transitions
    │   ├── creature.ts        # stage from XP, mood from happiness, rewards, penalties
    │   ├── leave.ts           # grace-period decisions
    │   ├── streak.ts
    │   ├── unlocks.ts         # V2: which colors/accessories are earned
    │   └── weeklyStats.ts     # V2: per-label and weekly totals
    ├── store/
    │   ├── useAppStore.ts     # Zustand store + IndexedDB persistence
    │   └── migrations.ts      # V1 -> V2 data migration
    ├── hooks/
    │   ├── useTicker.ts       # re-render ~4x per second while visible
    │   ├── useVisibility.ts   # visibilitychange + lastSeenAt heartbeat
    │   └── useWakeLock.ts
    ├── components/
    │   ├── Creature/          # SVG fox, accessory layers, Lottie player, speech bubble
    │   ├── TimerRing.tsx
    │   ├── HappinessBar.tsx
    │   ├── Celebration.tsx
    │   ├── LabelPicker.tsx    # V2
    │   ├── PresetPicker.tsx   # V2
    │   └── ShareCard.tsx      # V2
    ├── screens/
    │   ├── Onboarding.tsx
    │   ├── Home.tsx
    │   ├── Stats.tsx
    │   ├── Settings.tsx
    │   ├── Labels.tsx         # V2
    │   └── Wardrobe.tsx       # V2
    └── assets/lottie/         # fox animation JSON files
```

## Build milestones

Ask Claude Code to do one milestone at a time, run the app and tests, and stop for review before the next.

1. **Scaffold.** Vite React TypeScript project, Tailwind, ESLint/Prettier, Vitest, `vite-plugin-pwa` with a placeholder icon.
   - Done when: `npm run dev`, `npm run build` and `npm test` all pass.
2. **Pure logic + tests.** `config.ts`, `logic/timer.ts`, `logic/creature.ts`, `logic/leave.ts`, `logic/streak.ts` with unit tests for every rule in this spec.
   - Done when: tests cover XP thresholds, happiness clamping, decay, comeback bonus, grace decisions and streak resets.
3. **Store + persistence.** Zustand store with IndexedDB persistence and the actions `startFocus`, `pause`, `resume`, `giveUp`, `complete`, `skipBreak`, `handleHidden`, `handleVisible`.
   - Done when: reloading the page keeps all progress and an active session.
4. **Timer UI.** Home screen with the countdown ring, phase label, session dots and buttons; the static fox in a placeholder SVG.
   - Done when: a full 4-session cycle works (test with 1 min / 10 s settings).
5. **Leave detection + Wake Lock.** `useVisibility`, heartbeat, grace logic, Worried/Disappointed states, Wake Lock handling.
   - Done when: switching tabs for under 10 s is forgiven, over 10 s abandons, and closing the app mid-session is handled on restart.
6. **The fox.** SVG fox for all 5 stages and 4 moods with CSS fallback animations, Lottie player wired in behind the same component, speech bubbles, celebration and stage-up moments.
   - Done when: every stage × mood combination renders, and reduced-motion mode works.
7. **Onboarding, Stats, Settings.** As described in Screens and UI.
   - Done when: first run asks for a name, settings change the timer, reset clears everything. **V1 is complete here: test it on a real phone before V2.**
8. **V2 data + presets.** Store version 2 with migration, labels, presets and wardrobe state; `PresetPicker` on Home.
   - Done when: V1 data upgrades without loss (tested), and each preset runs with the right lengths and XP.
9. **V2 labels.** `Labels` screen, `LabelPicker` on Home, label saved on each session, per-label bars in Stats via `logic/weeklyStats.ts`.
   - Done when: 7- and 30-day totals per label match the session history in tests.
10. **V2 wardrobe + unlocks.** `logic/unlocks.ts` with tests, accessory SVG layers for every stage, color variants, Wardrobe screen, unlock celebration.
    - Done when: each unlock triggers exactly once at its threshold and every accessory fits every stage.
11. **V2 share card.** `ShareCard` rendered with `html-to-image`, shared via Web Share API with a PNG download fallback.
    - Done when: sharing works on Android and iPhone, and downloading works on desktop.
12. **PWA polish.** Real icons, iOS meta tags, install button/tip, update-safe service worker, offline check.
    - Done when: Lighthouse installability passes and the app runs in airplane mode after first load.
13. **Deploy.** Push to GitHub and deploy to the chosen host.
    - Done when: it installs from the live URL on a real phone.

## Testing and acceptance criteria

V1 is done when every box below is checked on a real Android phone, a real iPhone (installed to the home screen) and desktop Chrome.

**Automated (Vitest):** every function in `src/logic/` has tests, using fake timestamps rather than real waiting. Add a dev-only "fast mode" setting (1 min focus, 10 s break) for manual testing.

- [ ] Completing a focus session adds XP equal to focus minutes and +10 happiness
- [ ] The egg hatches after the first completed session
- [ ] Stage changes at exactly 25, 125, 375 and 1000 XP, with the stage-up moment
- [ ] Every 4th session gives a long break and +5 bonus happiness
- [ ] Give up asks for confirmation, then applies -15 happiness and 0 XP
- [ ] Leaving for 5 s and returning resumes the session with no penalty
- [ ] Leaving for 15 s abandons the session on return
- [ ] Killing the app mid-session and reopening a minute later shows it as abandoned
- [ ] Timer stays accurate after the phone was hidden or the tab was in the background
- [ ] Screen stays on during focus (where Wake Lock is supported)
- [ ] A day with no sessions lowers happiness by 5 on next open; the streak resets
- [ ] Happiness never goes below 0 or above 100
- [ ] All progress survives reloads and app restarts
- [ ] App installs, opens full-screen and works in airplane mode
- [ ] Reduced-motion setting is respected

**V2 checks:**

- [ ] Opening the app with saved V1 data upgrades to V2 with nothing lost
- [ ] Deep and Marathon presets run 50 and 90 min focus and award 50 and 90 XP
- [ ] A session's label shows up in the 7- and 30-day per-label stats
- [ ] Archived labels disappear from the picker but keep their history in Stats
- [ ] Each unlock appears once, at its exact threshold, with the celebration
- [ ] Every accessory and color looks right on all 5 stages
- [ ] The share card opens the share sheet on phones and downloads a PNG on desktop

## Future versions

V2 is now part of the first build (see Build scope). Do not build V3 yet, but keep the code open for it: logic stays in pure functions and all saved data goes through the versioned store.

**V3:**

- Evolution branches based on habits: morning sessions → sunny fox, late-night sessions → moon fox, long streaks → nine-tailed fox
- Food and treats earned from long breaks
- Accounts and sync (for example Supabase) so progress moves between devices
- Friends and shared "study rooms" where everyone's creatures sit together
- Push notifications through a small server for "time's up" alerts while the app is closed
