# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Repository layout

Three separate workspaces that share nothing at the module level:

```
/
├── client/     Vite + React 18 + TypeScript PWA (web — largely feature-frozen)
├── server/     Express + SQLite (web backend + AI content API for mobile)
└── mobile/     Expo SDK 54 + React Native + TypeScript (primary target)
```

---

## Commands

### Root (web dev)
```bash
npm run dev          # runs client + server concurrently
npm run install:all  # installs root + client + server
```

### Server
```bash
cd server && npm run dev          # nodemon, port 3001
```
Reset the SQLite database (forces re-seed on next start):
```bash
rm server/data/dialed.db
```
Demo credentials: `alex@miami.edu` / `dialed123` — seed runs automatically when this user doesn't exist.

### Client (web)
```bash
cd client && npm run dev          # Vite HMR, port 5173
cd client && npx tsc --noEmit     # TypeScript check
cd client && npm run build        # outputs to client/dist/
```

### Mobile (Expo)
```bash
cd mobile && npx expo start               # LAN QR code for Expo Go
cd mobile && npx expo start --tunnel      # tunnel mode (different WiFi / behind NAT)
cd mobile && npm run lint                 # expo lint
```
Requires `mobile/.env` with `EXPO_PUBLIC_API_URL=http://<LAN_IP>:3001` pointing to the Express server for AI content features. Supabase credentials are hardcoded in `mobile/src/lib/supabase.ts`.

---

## Mobile architecture (primary)

**Routing**: expo-router with file-based routes under `mobile/src/app/`. Tabs live in `(tabs)/`. Learn topic pages are under `learn/`.

**Data layer** (`mobile/src/lib/db.ts`): wraps Supabase with stale-while-revalidate caching (`withCache` in `mobile/src/lib/cache.ts`). Cache TTL is 5 minutes, keyed in AsyncStorage under `dialed_cache:`. After every mutation, call `clearCache(key)` so the next read fetches fresh data. The mobile app reads/writes CRM data through Supabase directly — it only calls the Express server for AI content endpoints.

**Two-sided home**: `home.tsx` has a `learnMode` state (persisted as `dialed_home_mode`) that toggles between `<LearnHome>` (Learn side) and the existing orbit/CRM view (Maintain side) via `<ModeToggle>`.

**Learn side** (`mobile/src/components/LearnHome.tsx`): 6 topic cards navigate via `router.push('/learn/<topic-id>')` to full-screen pages under `mobile/src/app/learn/`. Each topic page is self-contained and uses three shared components:
- `TopicPageHeader` — back button + title + progress bar
- `ChallengeSection` — checkboxes that persist via `mobile/src/lib/learnProgress.ts`
- `StreakBanner` — flame pill + 7-day dot strip, updated when any challenge is checked

**Learn progress + streak** (`mobile/src/lib/learnProgress.ts`): key AsyncStorage entries:
- `dialed_learn_progress_<topic>` — `{ completedChallenges: string[], featuresUsed: string[] }`
- `dialed_learn_streak` — `{ count, lastDate, history[] }` — `recordActivityToday()` is called from `ChallengeSection` on every check
- `dialed_archived_contacts` — `number[]` of contact IDs hidden from Orbit (UI-level, not deleted from Supabase)
- `dialed_company_pipeline` — Career Exposure company list with statuses and AI plans
- `dialed_book_tracker` — Authority & Mentors book statuses (`Want to Read | Reading | Completed`)
- `dialed_resume_draft` — last generated resume text

**AI content** flows through the Express server so the Anthropic API key stays server-side. Mobile calls `EXPO_PUBLIC_API_URL/api/content/*`. `outfit-check` uses `claude-sonnet-4-6` (vision required). All other content endpoints use `claude-haiku-4-5-20251001`.

**Theming** (`mobile/src/hooks/ThemeContext.tsx`): current default is `'cal'` (Cal AI warm off-white). Toggle cycles `cal → dark → cal`. Every screen calls `const c = useColors()` and passes `c` into a local `makeStyles(c)` — never hardcode color strings in StyleSheet. To revert to dark: change `useState<ThemeMode>('cal')` to `'dark'`. To revert display font to Cormorant Garamond: update `FontFamily.display` in `mobile/src/constants/theme.ts`.

Color palettes are in `mobile/src/constants/theme.ts`: `DarkColors`, `LightColors`, `CalColors`. Semantic tokens: `background`, `surface`, `border`, `elevated`, `primary`, `secondary`, `tertiary`, `gold`, `overdue`, `warning`, `success`, `subtleBorder`.

**Swipeable contacts** (Orbit): uses `Swipeable` from `react-native-gesture-handler` with `renderLeftActions` (swipe right reveals Archive + Delete). The screen root is wrapped in `GestureHandlerRootView`.

---

## Web architecture (secondary)

**Client** (`client/`): Vite + React 18 + TypeScript + Tailwind + Framer Motion PWA. All TypeScript interfaces in `client/src/types.ts`. Single `req<T>()` fetch helper in `client/src/lib/api.ts`; named domain groups: `authApi`, `contactsApi`, `oppsApi`, `notifApi`, `gmailApi`, `draftApi`, `pendingApi`. Tracker page uses raw `fetch` directly — only exception.

**Auth**: JWT in `httpOnly` cookie. Server middleware `auth.js` → `req.userId`. Client uses `credentials: 'include'`. `useAuth` hook calls `GET /api/auth/me` on mount; loading state blocks render.

**Status computation** is duplicated intentionally between `server/src/routes/contacts.js` and `client/src/lib/utils.ts`. Keep them in sync:
- `overdue`: `daysSince > cadenceDays`
- `due-soon`: `daysSince > cadenceDays - 3`
- Star → cadence: `{ 5→5d, 4→10d, 3→14d, 2→21d, 1→30d }`

**Database migrations**: new tables via `CREATE TABLE IF NOT EXISTS` in `schema.sql`. New columns use `addCol()` in `database.js` (try/catch ALTER TABLE, silently no-ops if column exists). Never drop columns or change types.

**Route ordering gotcha**: in `notifications.js`, `PUT /read-all` must be registered before `PUT /:id/read`. Same pattern in `contacts.js`: `/pending-responses` and `/suggestions` before `/:id`.

**Escalation engine**: `startEscalationEngine()` runs `runEscalation()` + `runResponseEscalation()` at startup and every hour. Deduplicates by checking for existing notifications with the same `type`/`contact_id`/`opportunity_id` within a time window.

**Framer Motion**: `layoutId="dialed-wordmark"` FLIPs the wordmark from `JarvisGreeting` → `Home`. `AnimatePresence mode="wait"` drives page transitions keyed on `location.pathname.split('/')[1] || 'home'`. Animate `transform`/`opacity` only — never layout properties.

**Web Tailwind tokens**: `background` (#141318) · `surface` (#1E1C24) · `border` (#2C2A34) · `elevated` (#252330) · `primary` (#F2EDE8) · `secondary` (#8A8490) · `tertiary` (#5A5760) · `gold` (#C9A84C) · `overdue` (#E05252) · `warning` (#D4852A) · `success` (#5BA882). Fonts: `font-display` (Cormorant Garamond) for names/titles/counters; `font-sans` (DM Sans) for everything else.

---

## Full API surface (Express server)

```
POST /api/auth/login|register|logout    GET  /api/auth/me
GET|POST      /api/contacts             GET|PUT|DELETE /api/contacts/:id
PUT           /api/contacts/:id/talked  GET            /api/contacts/pending-responses
GET           /api/contacts/suggestions
PUT           /api/pending-responses/:id/dismiss|responded
GET|POST      /api/opportunities        PUT|DELETE     /api/opportunities/:id
GET           /api/notifications        PUT            /api/notifications/read-all
PUT           /api/notifications/:id/read              DELETE /api/notifications/:id
GET           /api/gmail/status|recent  POST           /api/gmail/sync
POST          /api/draft
GET           /api/tracker
POST          /api/content/challenge|article|outfit-check|resume-copy
POST          /api/content/company-plan|venue-suggestions|books|linkedin-audit
```
