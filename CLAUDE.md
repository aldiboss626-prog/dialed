# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
# Root — run both servers concurrently (requires npm install at root first)
npm run dev

# Server only (from repo root)
cd server && npm run dev      # nodemon, restarts on change

# Client only (from repo root)
cd client && npm run dev      # Vite HMR on port 5173

# Install all dependencies from scratch
npm run install:all           # installs root + client + server

# TypeScript check (no emit)
cd client && npx tsc --noEmit

# Production build
cd client && npm run build    # outputs to client/dist/
```

**Reset the database** (forces re-seed on next server start):
```bash
rm server/data/dialed.db
```
The seed runs automatically when `alex@miami.edu` does not exist in the database. Demo credentials: `alex@miami.edu` / `dialed123`.

## Architecture

Monorepo. `client/` is a Vite + React 18 + TypeScript PWA. `server/` is Express + SQLite. They are entirely separate npm workspaces — never import across the boundary at the module level.

```
/
├── client/                  Vite + React 18 + TypeScript + Tailwind + Framer Motion
│   └── src/
│       ├── App.tsx          Router, AuthProvider, JarvisGreeting mount point
│       ├── types.ts         All shared TypeScript interfaces (single source of truth)
│       ├── lib/
│       │   ├── api.ts       All fetch calls, grouped by domain (authApi, contactsApi, …)
│       │   ├── utils.ts     computeStatus, computeOpportunityState, starToCadence, helpers
│       │   └── escalation.ts  Client-side escalation intensity labels for Tracker/Notifications
│       ├── hooks/
│       │   └── useAuth.tsx  AuthContext + provider — wraps entire app in App.tsx
│       ├── components/
│       │   ├── BottomNav.tsx          5-tab nav: Home|Orbit|Opps|Tracker|Settings
│       │   ├── JarvisGreeting.tsx     2.6s intro overlay, plays once per page load
│       │   ├── NotificationSheet.tsx  Bottom sheet for alerts (accessed via bell on Home)
│       │   ├── AddContactModal.tsx    Bottom sheet for adding contacts
│       │   ├── DraftModal.tsx         AI draft modal (follow-up OR reply mode)
│       │   └── ui/                    Avatar, SectionLabel, StatusBadge, Stars
│       └── pages/
│           ├── Home.tsx               Summary strip, pending-response section, contact cards
│           ├── Orbit.tsx              Searchable/filterable contact list
│           ├── ContactDetail.tsx      Core loop screen — emails, history, We talked, Draft
│           ├── Opportunities.tsx      Deadline tracker
│           ├── Tracker.tsx            Orbit health, streak, top-3, heatmap, response rate
│           ├── Notifications.tsx      Full-page notifications (route kept, not in nav)
│           └── Settings.tsx           Gmail, cadence defaults, notification toggles
└── server/
    └── src/
        ├── index.js            Express setup, registers all routes, starts escalation
        ├── db/
        │   ├── schema.sql      Canonical table definitions (CREATE TABLE IF NOT EXISTS)
        │   ├── database.js     Opens DB, runs schema, runs column migrations, exports db
        │   └── seed.js         Demo data for alex@miami.edu — skips if user exists
        ├── middleware/
        │   └── auth.js         JWT cookie verification → req.userId
        ├── routes/
        │   ├── auth.js         login, register, logout, me
        │   ├── contacts.js     CRUD + /talked + /pending-responses + /suggestions
        │   ├── opportunities.js
        │   ├── notifications.js  read-all registered BEFORE /:id/read (order matters)
        │   ├── gmail.js         Simulated Gmail; POST /sync triggers gmailSync
        │   ├── draft.js         POST /draft — calls Anthropic claude-sonnet-4-6
        │   ├── pendingResponses.js  PUT /:id/dismiss and /:id/responded
        │   └── tracker.js       GET /tracker — all Tracker screen stats in one query
        └── services/
            ├── escalation.js    runEscalation + runResponseEscalation, called hourly
            └── gmailSync.js     detectPendingResponses — scans threads for unanswered inbound
```

## Key patterns and constraints

### Status computation (duplicated intentionally)
`computeStatus(lastContactDate, cadenceDays)` exists in **both** `server/src/routes/contacts.js` and `client/src/lib/utils.ts`. The server computes status for every contacts API response. The client version is available for local use (Tracker, Orbit filters). Keep them in sync if the formula changes.

Contact status thresholds:
- `overdue`: `daysSince > cadenceDays`
- `due-soon`: `daysSince > cadenceDays - 3`
- `good`: everything else

Star → cadence mapping (also duplicated, also intentional): `{ 5→5d, 4→10d, 3→14d, 2→21d, 1→30d }`

### Database migrations
`schema.sql` handles new tables via `CREATE TABLE IF NOT EXISTS`. New **columns** on existing tables go in `database.js` using `addCol()` — a try/catch ALTER TABLE that silently no-ops if the column exists. Never alter existing column types or drop columns.

### Route ordering gotcha
In `notifications.js`, `PUT /read-all` must be registered **before** `PUT /:id/read` — otherwise Express matches `"read-all"` as the `:id` parameter. The same ordering care applies in `contacts.js` where `/pending-responses` and `/suggestions` come before `/:id`.

### Auth flow
JWT stored in `httpOnly` cookie. All server routes use `authenticate` middleware (`req.userId`). All client fetch calls use `credentials: 'include'`. The `useAuth` hook calls `GET /api/auth/me` on mount; loading state prevents flash of login screen.

### AI draft — two modes
`POST /api/draft` accepts `{ contactId, pendingResponseId? }`. When `pendingResponseId` is provided, the server fetches the email thread and uses a reply-specific system prompt ("reply to an email you received") instead of the default cold follow-up prompt. The `DraftModal` component takes an optional `pendingResponseId` prop that propagates this distinction.

### Awaiting-reply feature
Triggered by `POST /api/gmail/sync`. `gmailSync.detectPendingResponses` scans `email_threads` for each gmail-connected contact: if the most recent email is `is_from_user = 0` and no later email is `is_from_user = 1`, a `pending_responses` record is created. `PUT /api/contacts/:id/talked` auto-resolves any pending responses for that contact server-side. The `JarvisGreeting` and Home screen summary strip both consume `GET /api/contacts/pending-responses`.

### Escalation engine
`startEscalationEngine()` in `index.js` calls both `runEscalation()` (cadence + opportunity deadline notifications) and `runResponseEscalation()` (pending-response nudges) once at startup, then every hour. Notifications are deduplicated by checking for recent notifications with the same `type`/`contact_id`/`opportunity_id` within a time window before inserting.

### Framer Motion patterns
- `layoutId="dialed-wordmark"` on the `<motion.h1>` in both `JarvisGreeting.tsx` and `Home.tsx` — Framer Motion FLIPs the wordmark from centered to top-left when the greeting unmounts.
- `AnimatePresence mode="wait"` in `App.tsx` drives page transitions. Key is `location.pathname.split('/')[1] || 'home'` so `/contact/1` and `/contact/2` share a transition key.
- All animations use `transform` and `opacity` only. Never animate `height`, `width`, or other layout properties.

### API client (`client/src/lib/api.ts`)
Single `req<T>()` helper wraps all fetch calls. All domain groups (`authApi`, `contactsApi`, `oppsApi`, `notifApi`, `gmailApi`, `draftApi`, `pendingApi`) are named exports. The Tracker page uses raw `fetch` directly because it has its own loading logic — this is the only exception.

### Tailwind color tokens
Full list: `background` (#141318) · `surface` (#1E1C24) · `border` (#2C2A34) · `elevated` (#252330) · `primary` (#F2EDE8) · `secondary` (#8A8490) · `tertiary` (#5A5760) · `gold` (#C9A84C) · `overdue` (#E05252) · `warning` (#D4852A) · `success` (#5BA882) · `neutral` (#5A5760)

Font rules: `font-display` (Cormorant Garamond) for names, titles, day counters, wordmark. `font-sans` (DM Sans) for everything else. Never swap these.

## Full API surface

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
```
