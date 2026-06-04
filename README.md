# Dialed

**Dialed tells ambitious students who in their network is going cold and makes it effortless to reconnect before the opportunity is lost.**

A full-stack PWA for tracking relationship cadences, AI-drafting follow-ups, and staying on top of what matters — before the deadline passes.

---

## What it does

- **Orbit** — your full contact list, sorted by who needs attention most. Overdue contacts surface to the top. Color-coded by urgency (red → amber → green).
- **Core loop** — open the app, see the red card, tap, draft a follow-up with AI, send, tap "We talked." Card flips green. Takes under 30 seconds.
- **Awaiting Reply** — detects unanswered inbound emails from your contacts and escalates reminders until you respond.
- **Opportunities** — lightweight deadline tracker linked to contacts. Escalation notifications intensify as deadlines approach.
- **Tracker** — Orbit Health score, consistency streak, 30-day activity heatmap, top relationships by engagement, and response rate.
- **AI Drafting** — context-aware follow-up drafts via Anthropic Claude. Distinguishes between cold outreach and replying to an inbound email.
- **Jarvis Greeting** — animated intro sequence on every app load with a dynamic context line ("You have 2 contacts waiting.").

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + Framer Motion |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Auth | JWT in httpOnly cookies |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| PWA | vite-plugin-pwa + Workbox |

---

## Getting started

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/) for AI draft generation

### Install

```bash
git clone https://github.com/your-username/dialed.git
cd dialed
npm run install:all
```

### Configure

```bash
# server/.env
PORT=3001
JWT_SECRET=your_jwt_secret
ANTHROPIC_API_KEY=your_anthropic_key
NODE_ENV=development

# client/.env
VITE_API_URL=http://localhost:3001
```

### Run

```bash
npm run dev
```

- Client → `http://localhost:5173`
- Server → `http://localhost:3001`

The database seeds automatically on first start. Demo account: `alex@miami.edu` / `dialed123`

---

## Project structure

```
/
├── client/          Vite + React PWA
│   └── src/
│       ├── pages/   Home, Orbit, ContactDetail, Opportunities, Tracker, Settings
│       ├── components/  BottomNav, DraftModal, AddContactModal, JarvisGreeting, NotificationSheet
│       ├── lib/     api.ts (all fetch calls), utils.ts (status logic)
│       └── types.ts All TypeScript interfaces
└── server/
    └── src/
        ├── routes/  auth, contacts, opportunities, notifications, draft, tracker, gmail
        ├── services/ escalation.js (hourly cadence + deadline engine), gmailSync.js
        └── db/      schema.sql, database.js (migrations), seed.js
```

---

## Key concepts

### Star rating → cadence

| Stars | Cadence | Escalation |
|---|---|---|
| ★★★★★ | Every 5 days | Daily alerts near deadlines |
| ★★★★ | Every 10 days | Escalates near deadlines |
| ★★★ | Every 14 days | One nudge per cycle |
| ★★ | Every 21 days | Light reminder |
| ★ | Every 30 days | Minimal |

### Contact status

A contact is `overdue` when `days_since_contact > cadence_days`, `due-soon` when within 3 days of the cadence threshold, and `good` otherwise. Computed server-side on every contacts response.

### Orbit Health Score

```
score = 100
  − 8 per overdue contact
  − 4 per due-soon contact
  − 5 per pending unanswered email
  + 2 per interaction logged this week
  (clamped 0–100)
```

### Awaiting Reply

When Gmail syncs, the app checks if the most recent email from a contact has no user reply after it. If not, a `pending_responses` record is created and escalating notifications are sent based on the contact's star rating. Resolved when the user replies, dismisses, or taps "We talked."

---

## Resetting the database

```bash
rm server/data/dialed.db
# restart the server — seed runs automatically
```

---

## License

MIT
