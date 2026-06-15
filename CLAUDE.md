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
Demo credentials: `alex@miami.edu` / `dialed123` — seed runs automatically when this user doesn't exist. **These only exist in SQLite (web). Mobile uses Supabase Auth — create a new account via the app.**

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
cd mobile && npx tsc --noEmit            # TypeScript check (run after every change)
cd mobile && npm run lint                 # expo lint
```
Requires `mobile/.env` with `EXPO_PUBLIC_API_URL=http://<LAN_IP>:3001` pointing to the Express server for AI content features. Supabase credentials are hardcoded in `mobile/src/lib/supabase.ts`.

---

## Mobile architecture (primary)

**Routing**: expo-router with file-based routes under `mobile/src/app/`. Tabs live in `(tabs)/`. Learn topic pages are under `learn/`. Full-screen routes registered in `_layout.tsx`:
- `upgrade` — fade, `gestureEnabled: false`
- `onboarding` — fade, `gestureEnabled: false`
- `permissions` — fade, `gestureEnabled: false`
- `contact/[id]` — ios_from_right slide

**New-user startup flow**: `index.tsx` → `/landing` → `/onboarding` (12-step quiz + account creation) → `/permissions` (7-step permission flow) → `/upgrade` (paywall). Returning users: `/login` → `/(tabs)/home` (if onboarded) or `/onboarding`. Session restore: `index.tsx` → `/(tabs)/home` immediately.

**Provider tree** (outermost to innermost in `_layout.tsx`):
`SafeAreaProvider > ThemeProvider > DevProProvider > AuthProvider`

**Data layer** (`mobile/src/lib/db.ts`): wraps Supabase with stale-while-revalidate caching (`withCache` in `mobile/src/lib/cache.ts`). Cache TTL is 5 minutes, keyed in AsyncStorage under `dialed_cache:`. After every mutation, call `clearCache(key)` so the next read fetches fresh data. The mobile app reads/writes CRM data through Supabase directly — it only calls the Express server for AI content endpoints.

**Two-sided home**: `home.tsx` has a `learnMode` state (persisted as `dialed_home_mode`) that toggles between `<LearnHome>` (Learn side) and the existing orbit/CRM view (Maintain side) via `<ModeToggle>`.

**Learn side** (`mobile/src/components/LearnHome.tsx`): 6 topic cards navigate via `router.push('/learn/<topic-id>')` to full-screen pages under `mobile/src/app/learn/`. Each topic page is self-contained and uses three shared components:
- `TopicPageHeader` — back button + title + progress bar
- `ChallengeSection` — checkboxes that persist via `mobile/src/lib/learnProgress.ts`
- `StreakBanner` — flame pill + 7-day dot strip, updated when any challenge is checked

All 6 learn AI fetch functions (`career-exposure`, `coffee-dates`, `linkedin-tips`, `dealing-with-authority`, `networking-101`, `workplace-etiquette`) are Pro-gated: call `openUpgrade()` and early-return if `!isPro`.

**Learn progress + streak** (`mobile/src/lib/learnProgress.ts`): key AsyncStorage entries:
- `dialed_learn_progress_<topic>` — `{ completedChallenges: string[], featuresUsed: string[] }`
- `dialed_learn_streak` — `{ count, lastDate, history[] }` — `recordActivityToday()` is called from `ChallengeSection` on every check
- `dialed_archived_contacts` — `number[]` of contact IDs hidden from Orbit (UI-level, not deleted from Supabase)
- `dialed_company_pipeline` — Career Exposure company list with statuses and AI plans
- `dialed_book_tracker` — Authority & Mentors book statuses (`Want to Read | Reading | Completed`)
- `dialed_resume_draft` — last generated resume text
- `dialed_onboarded` — `'1'` once user has completed onboarding; checked by `login.tsx` to route new users to onboarding on first login
- `dialed_dev_pro_override` — `'1'` to force Pro access without Supabase changes (Dev Mode toggle in Settings)
- `dialed_home_mode` — `'learn' | 'maintain'` for the two-sided home toggle

**AI content** flows through the Express server so the Anthropic API key stays server-side. Mobile calls `EXPO_PUBLIC_API_URL/api/content/*`. `outfit-check` uses `claude-sonnet-4-6` (vision required). All other content endpoints use `claude-haiku-4-5-20251001`.

**Theming** (`mobile/src/hooks/ThemeContext.tsx`): current default is `'cal'` (Cal AI warm off-white). Toggle cycles `cal > dark > cal`. Every screen calls `const c = useColors()` and passes `c` into a local `makeStyles(c)` — never hardcode color strings in StyleSheet.

Color palettes are in `mobile/src/constants/theme.ts`: `DarkColors`, `LightColors`, `CalColors`. Semantic tokens: `background`, `surface`, `border`, `elevated`, `primary`, `secondary`, `tertiary`, `gold`, `overdue`, `warning`, `success`, `subtleBorder`.

**Swipeable contacts** (Orbit): uses `Swipeable` from `react-native-gesture-handler` with `renderLeftActions` (swipe right reveals Archive + Delete). The screen root is wrapped in `GestureHandlerRootView`.

**Health score system** (`mobile/src/lib/health.ts`): single source of truth for all health computation. Formula: `Math.max(0, Math.min(100, Math.round((1 - days_since_contact / cadence_days) * 100)))`. Four bands: 0–25 Critical (`c.overdue`), 26–50 Needs attention (`c.warning`), 51–75 Good (`c.success`), 76–100 Strong (`c.success`). Functions: `contactHealthScore()`, `healthBand()`, `healthLabel()`, `healthColor(c, score)`. Every screen imports from here — never compute health inline or use a different formula.

**Notification bell**: `HeaderBell` component (`mobile/src/components/HeaderBell.tsx`) lives in the header of each of the 5 tab screens. The floating `GlobalActions` overlay is now FAB-only (no bell). Add 64px to all scrollview bottom padding (on top of `useTabBarPadding()`) to clear the FAB.

**Loading states**: use `SkeletonBlock` (`mobile/src/components/SkeletonBlock.tsx`) instead of `ActivityIndicator` for all AI content loading. Animated opacity pulse, `useNativeDriver: true`.

**All People screen** (`mobile/src/app/people.tsx`): filter chips use health bands (All / Strong / Good / Needs attention / Critical) computed from `healthBand(contactHealthScore(ct))`, not raw `contact.status` strings.

---

## Pro tier system

**Tier storage**: Supabase `auth.users.user_metadata.tier` — either `'free'` or `'pro'`. No new table needed. Set manually in the Supabase dashboard for testing, or via the RevenueCat webhook in production.

**`useAuth.tsx`** — `sessionToUser()` pulls `user_metadata?.tier ?? 'free'` and maps it onto the `User` type:
```typescript
export interface User { id: string; email: string; name: string; tier: 'free' | 'pro' }
```

**`usePro()`** (`mobile/src/hooks/usePro.ts`) — single source of truth for Pro status:
```typescript
const isPro = devProOverride || user?.tier === 'pro'
function openUpgrade() { router.push('/upgrade') }
return { isPro, openUpgrade }
```
Always use `usePro()` to gate features — never check `user?.tier` directly.

**`DevProProvider`** (`mobile/src/hooks/useDevPro.tsx`) — React context wrapping the whole app. Persists `dialed_dev_pro_override` to AsyncStorage. Enables Dev Mode in Settings > "Force Pro Access" toggle for testing without touching Supabase. Access via `useDevPro()`.

**`ProGate`** (`mobile/src/components/ProGate.tsx`) — wraps UI elements; shows a tappable lock overlay if `!isPro`. Props: `feature?: string`, `children: React.ReactNode`.

**`upgrade.tsx`** (`mobile/src/app/upgrade.tsx`) — full-screen modal. Shows 6 Pro feature bullets, $9.99/month CTA, Restore Purchases, "Maybe later". `dismiss()` uses `navigation.canGoBack() ? router.back() : router.replace('/(tabs)/home')` to handle both push and replace entry points. Purchase/restore are `console.log` placeholders until RevenueCat SDK is installed.

**`onboarding.tsx`** (`mobile/src/app/onboarding.tsx`) — 12-step quiz shown to new users before account creation (controlled by `dialed_onboarded` AsyncStorage key). Steps: name input → age → career stage → goal → blocker → recognition checklist → consequence cards → social proof → loading animation → trust slide → results/health chart → account creation. After account creation routes to `/permissions`. Exports `ONBOARDED_KEY` for use in `login.tsx`. `login.tsx` checks `dialed_onboarded` after sign-in: missing → `/onboarding`, present → `/(tabs)/home?welcome=1`. New registrations from `login.tsx` also route to `/permissions`.

**`permissions.tsx`** (`mobile/src/app/permissions.tsx`) — 7-step permission flow shown once after account creation. Steps: thank-you screen → 5 permission slides (contacts, notifications, gmail, calendar, photos) → all-set constellation screen → `/upgrade`. Contacts/notifications/photos trigger real native permission dialogs (`expo-contacts`, `expo-notifications`, `expo-image-picker`). Gmail shows a "Requires Pro" chip; calendar shows "Coming soon". Uses `OrbitGraphic` (SVG bezier connector lines + hero icon tile + animated check node) and `ConstellationGraphic` (pentagon of 5 glyphs, lit when granted).

**RevenueCat webhook** (`server/src/routes/webhooks.js`): `POST /api/webhooks/revenuecat` — verifies HMAC-SHA256 signature, then calls Supabase Admin API (`/auth/v1/admin/users/:id`) to flip `user_metadata.tier`. Required env vars: `REVENUECAT_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. PRO_EVENTS: `INITIAL_PURCHASE`, `RENEWAL`, `UNCANCELLATION`, `PRODUCT_CHANGE`. FREE_EVENTS: `EXPIRATION`, `BILLING_ISSUE`.

**What's Pro-gated**:
- Tracker tab (hard gate — free users see an upgrade CTA instead of the full tab)
- All AI fetch functions in the 6 learn topic pages
- Opportunity AI suggestions (via `ProGate`)

**RevenueCat SDK** is not yet installed. Requires `npx expo install react-native-purchases`, `npx expo prebuild`, and EAS Build — not compatible with Expo Go.

---

## Score history computation

**Real score history** (`buildRealScoreHistory(contacts, periods)`): used in `orbit.tsx` and `tracker.tsx`. Derives historical health scores from existing contact data by shifting `days_since_contact` back by N*30 days and re-applying overdue/due-soon logic. Contacts added after each reference point are excluded via `daysSince(created_at) >= daysAgo`.

```typescript
// For each period i (0 = oldest, periods-1 = now):
const daysAgo = (periods - 1 - i) * 30
const existing = contacts.filter(c => daysSince(c.created_at) >= daysAgo)
// effectiveDays = Math.max(0, c.days_since_contact - daysAgo)
// score = 100 - overdue*12 - dueSoon*5
```

**Growth history** (`buildGrowthHistory(contacts, periods)`): counts contacts added before each 30-day cutoff. Used in `orbit.tsx` when `quickFilter === 'new'`.

**Opp history** remains synthetic (`deterministicHistory`) — there is no equivalent of `days_since_contact` for opportunities.

---

## Web architecture (secondary)

**Client** (`client/`): Vite + React 18 + TypeScript + Tailwind + Framer Motion PWA. All TypeScript interfaces in `client/src/types.ts`. Single `req<T>()` fetch helper in `client/src/lib/api.ts`; named domain groups: `authApi`, `contactsApi`, `oppsApi`, `notifApi`, `gmailApi`, `draftApi`, `pendingApi`. Tracker page uses raw `fetch` directly — only exception.

**Auth**: JWT in `httpOnly` cookie. Server middleware `auth.js` sets `req.userId`. Client uses `credentials: 'include'`. `useAuth` hook calls `GET /api/auth/me` on mount; loading state blocks render.

**Status computation** is duplicated intentionally between `server/src/routes/contacts.js` and `client/src/lib/utils.ts`. Keep them in sync:
- `overdue`: `daysSince > cadenceDays`
- `due-soon`: `daysSince > cadenceDays - 3`
- Star to cadence: `{ 5:5d, 4:10d, 3:14d, 2:21d, 1:30d }`

**Database migrations**: new tables via `CREATE TABLE IF NOT EXISTS` in `schema.sql`. New columns use `addCol()` in `database.js` (try/catch ALTER TABLE, silently no-ops if column exists). Never drop columns or change types.

**Route ordering gotcha**: in `notifications.js`, `PUT /read-all` must be registered before `PUT /:id/read`. Same pattern in `contacts.js`: `/pending-responses` and `/suggestions` before `/:id`.

**Escalation engine**: `startEscalationEngine()` runs `runEscalation()` + `runResponseEscalation()` at startup and every hour. Deduplicates by checking for existing notifications with the same `type`/`contact_id`/`opportunity_id` within a time window.

**Framer Motion**: `layoutId="dialed-wordmark"` FLIPs the wordmark from `JarvisGreeting` to `Home`. `AnimatePresence mode="wait"` drives page transitions keyed on `location.pathname.split('/')[1] || 'home'`. Animate `transform`/`opacity` only — never layout properties.

**Web Tailwind tokens**: `background` (#141318), `surface` (#1E1C24), `border` (#2C2A34), `elevated` (#252330), `primary` (#F2EDE8), `secondary` (#8A8490), `tertiary` (#5A5760), `gold` (#C9A84C), `overdue` (#E05252), `warning` (#D4852A), `success` (#5BA882). Fonts: `font-display` (Cormorant Garamond) for names/titles/counters; `font-sans` (DM Sans) for everything else.

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
POST          /api/webhooks/revenuecat
```
