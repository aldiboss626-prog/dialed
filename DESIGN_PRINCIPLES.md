# Dialed — Design Principles & System

> Single source of truth for product decisions, visual language, and component rules.
> Reference this before building any screen, component, or feature.

---

## 1. Product Mission

**"Dialed tells ambitious students who in their network is going cold and makes it effortless to reconnect before the opportunity is lost."**

Never deviate from this sentence. Every feature either serves it or doesn't belong in v1.

---

## 2. The Core Loop

This loop must complete in under 30 seconds. Protect it above everything else.

```
Open app
  → See overdue contact (red card)
  → Tap contact
  → Tap "Draft follow-up"
  → Send
  → Tap "We talked"
  → Card flips red → green
  → User feels relief
```

### Non-negotiables inside the loop

- **"We talked" button** must exist on every contact detail screen. No exceptions.
- **Red-to-green animation** when "We talked" is tapped: card flips, day counter animates to 0, green checkmark briefly appears. This is the dopamine hit. It must feel satisfying every single time.
- **Draft follow-up** must be one tap from the contact detail screen.

---

## 3. The Decision Rule

Before building any feature, ask: **"Does this make the core loop faster, clearer, or more rewarding?"**

- **Yes** → build it.
- **No** → flag it and ask for confirmation before touching a file.

---

## 4. The 6 Screens (exactly 6, no more)

| # | Screen | Purpose |
|---|--------|---------|
| 1 | **Home** | Who needs attention right now |
| 2 | **Orbit** | Full contact list, searchable/filterable |
| 3 | **Contact Detail** | Where the action happens |
| 4 | **Opportunities** | Context for why contacts matter |
| 5 | **Notifications** | Escalation intelligence made visible |
| 6 | **Settings** | Account, Gmail connection, defaults |

**Add Contact** = bottom sheet modal, not a route.  
**Tracker** exists as a 6th tab (replaces Notifications in the bottom nav; Notifications is accessible from Home).

---

## 5. v1 Feature Scope

### Build these only
- Five-star priority rating per contact (drives cadence + notification intensity)
- Quick-add modal (name, email, relationship type, stars)
- Gmail auto-suggest (surfaces frequent contacts not yet in Orbit)
- AI draft follow-up (context-aware, editable, one tap)
- Escalation notification engine (frequency scales with stars × deadline proximity)
- Opportunity tracker (title, linked contact, status, deadline)
- Gmail integration (in Settings)

### Explicitly cut from v1
LinkedIn integration, calendar sync, burnout/mood detection, "coming soon" placeholders, auto-sending messages, anything not in the list above.

---

## 6. Retention Mechanics

These are product rules, not suggestions.

- **Orbit is never fully green.** The summary strip — overdue contacts, due-soon, active opps, overdue opps — is the first thing seen on open. Urgency first, always.
- **Red card is the hook.** Red badge, red left-border treatment, large red day counter in Cormorant Garamond. Never soften the urgency of overdue.
- **Escalation must escalate.** 5-star contact + deadline 3 days out = daily notifications. Getting louder near deadlines, not quieter. Silence near a deadline is a bug.
- **Relationship history is the moat.** Every interaction logged, every email detected, every note stored. Display it clearly in the contact timeline.

---

## 7. Color System

All values apply to both the web (Tailwind tokens) and mobile (React Native `theme.ts`).

| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#141318` | App background, always the darkest layer |
| `surface` | `#1E1C24` | Cards, sheets, modals |
| `elevated` | `#252330` | Avatars, inputs, elements raised above surface |
| `border` | `#2C2A34` | Divider lines, row separators |
| `primary` | `#F2EDE8` | Body text, headings |
| `secondary` | `#8A8490` | Supporting text, subtitles |
| `tertiary` | `#5A5760` | Placeholder text, labels, disabled state |
| `gold` | `#C9A84C` | Primary accent — wordmark, CTA buttons, active tab, stars |
| `overdue` | `#E05252` | Overdue status, alerts, destructive actions |
| `warning` | `#D4852A` | Due-soon, pending responses, escalation |
| `success` | `#5BA882` | Good status, completed, Gmail connected |
| `neutral` | `#5A5760` | Inactive borders, neutral left-edge accents |

> **Note:** `tailwind.config.js` currently has `gold: '#B8943A'` which is a stale value. The canonical gold used everywhere in CSS and React Native is `#C9A84C`. The tailwind config should be updated to match.

### Status color mapping

| Status | Color | Token |
|--------|-------|-------|
| `overdue` | `#E05252` | `overdue` |
| `due-soon` | `#D4852A` | `warning` |
| `good` | `#5BA882` | `success` |

### Status thresholds

```
overdue   → daysSince > cadenceDays
due-soon  → daysSince > cadenceDays - 3
good      → everything else
```

### Star → cadence mapping

```
★★★★★  5 stars  →  5 days
★★★★☆  4 stars  →  10 days
★★★☆☆  3 stars  →  14 days
★★☆☆☆  2 stars  →  21 days
★☆☆☆☆  1 star   →  30 days
```

---

## 8. Typography

Two fonts. Never swap them.

| Role | Font | Tailwind class | RN fontFamily |
|------|------|---------------|---------------|
| **Display** | Cormorant Garamond | `font-display` | `CormorantGaramond-Bold` / `-SemiBold` |
| **UI / Body** | DM Sans | `font-sans` | `DMSans-Regular` / `-Medium` |

### Display font (`font-display` / Cormorant Garamond)
Use for: contact names, screen titles, day counters, the DIALED wordmark, large numbers.

### UI font (`font-sans` / DM Sans)
Use for: everything else — labels, body copy, buttons, captions, timestamps.

### Wordmark
```css
font-family: 'Cormorant Garamond', serif;
font-weight: 700;
letter-spacing: 0.12em;
color: #C9A84C;
```

### Section labels
```css
font-family: 'DM Sans', sans-serif;
font-size: 11px;
font-weight: 500;
letter-spacing: 0.15em;
text-transform: uppercase;
color: #5A5760;
```

---

## 9. Card & Box Treatment

Cards must feel like **soft physical objects resting gently above the background** — defined by light and shadow, not by hard lines. Nothing should have a sharp, high-contrast edge.

### Standard card
```css
background: #1E1C24;                           /* surface */
border-radius: 18px;                           /* rounded-[18px] */
border: 1px solid rgba(255, 255, 255, 0.04);   /* barely-visible hairline */
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.18);   /* soft lift */
```

### Modal / bottom sheet
```css
border-radius: 24px 24px 0 0;  /* rounded-t-3xl */
/* same border + shadow as card */
```

### Avatars / small boxes
```css
border-radius: 12px;   /* rounded-xl */
background: #252330;   /* elevated */
/* no border needed — background contrast is enough */
```

### Rules: what is forbidden on cards

| ❌ Never use | ✅ Use instead |
|-------------|--------------|
| Hard 1px solid `#2C2A34` border | Hairline `rgba(255,255,255,0.04)` |
| Thick colored left-border strips (`border-l-4`) | Soft background tint at 4–6% opacity if status must show |
| `shadow-overdue` / high-contrast drop shadows | `box-shadow: 0 4px 20px rgba(0,0,0,0.18)` |
| Neon outlines or glowing edges | Nothing — softness only |
| `border-l-4` accent strips | Omit, or use `rgba(color, 0.05)` background tint |

### Status accent on cards
If a card must communicate status on its edge, do **not** use a solid colored strip. Instead use a full-card background tint:

```
overdue card  → background: rgba(224, 82, 82, 0.05)
warning card  → background: rgba(212, 133, 42, 0.05)
gold card     → background: rgba(201, 168, 76, 0.05)
```

---

## 10. Spacing & Radius Scale

### Radius
| Name | Value | Use |
|------|-------|-----|
| `sm` | 8px | Small inputs, tiny chips |
| `md` | 14px | Avatars, small cards |
| `card` | 18px | All full cards and boxes |
| `sheet` | 24px | Modals, bottom sheets |
| `full` | 9999px | Pills, badges, dots |

### Spacing (React Native)
| Name | Value |
|------|-------|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 16px |
| `lg` | 24px |
| `xl` | 32px |

---

## 11. Buttons

### Primary (gold)
```css
background: #C9A84C;
color: #141318;
border-radius: 18px;
padding: 14px 24px;
font-family: DM Sans;
font-weight: 500;
font-size: 16px;
```
Active: `opacity: 0.85`

### Ghost (gold outline)
```css
background: transparent;
color: #C9A84C;
border: 1px solid #C9A84C;
border-radius: 18px;
padding: 14px 24px;
```
Active: `background: rgba(201,168,76,0.08)`

---

## 12. Animation Principles

All animations use `transform` and `opacity` only. Never animate `height`, `width`, or layout properties.

### Key animations

| Animation | Description |
|-----------|-------------|
| **Framer Motion FLIP** | `layoutId="dialed-wordmark"` on the `<h1>` in both `JarvisGreeting` and `Home` — wordmark flies from center to top-left on greeting exit |
| **Page transitions** | `AnimatePresence mode="wait"` in `App.tsx`. Key = `location.pathname.split('/')[1] \|\| 'home'` so `/contact/1` and `/contact/2` share a transition |
| **Pulse dot** | `animate-pulse-dot` — 2s ease-in-out infinite loop, scale 1 → 1.15 → 1. Used on pending response indicators |
| **Overdue badge appear** | `animate-overdue-appear` — 400ms ease-out one-shot, scale 0.9 → 1.04 → 1 with fade-in |
| **Count-up numbers** | JS `requestAnimationFrame` with cubic ease-out. Used on stat cards, day counters, tracker scores |
| **"We talked" button flash** | Framer Motion `useAnimation` — flashes gold fill then returns to ghost |

### Reduce motion
All animations are disabled via CSS media query `prefers-reduced-motion: reduce`.

---

## 13. Navigation Structure (Web)

```
Bottom nav (5 tabs):  Home | Orbit | Opps | Tracker | Settings
Slide-up modals:      Add Contact, Draft Follow-up, Notification Sheet
Full-screen pushes:   Contact Detail, Notifications (route kept, not in nav)
```

### Navigation Structure (Mobile — Expo Router)

```
/                   → redirects based on auth state
/login              → login screen
/(tabs)/home        → Home tab
/(tabs)/orbit       → Orbit tab
/(tabs)/opportunities → Opportunities tab
/(tabs)/tracker     → Tracker tab
/(tabs)/settings    → Settings tab
/contact/[id]       → Contact detail (pushed over tabs)
```

---

## 14. API Surface

```
POST /api/auth/login|register|logout    GET  /api/auth/me
GET|POST      /api/contacts             GET|PUT|DELETE /api/contacts/:id
PUT           /api/contacts/:id/talked  GET  /api/contacts/pending-responses
GET           /api/contacts/suggestions
PUT           /api/pending-responses/:id/dismiss|responded
GET|POST      /api/opportunities        PUT|DELETE /api/opportunities/:id
GET           /api/notifications        PUT  /api/notifications/read-all
PUT           /api/notifications/:id/read   DELETE /api/notifications/:id
GET           /api/gmail/status|recent  POST /api/gmail/sync
POST          /api/draft
GET           /api/tracker
```

### Auth
- Web: JWT in `httpOnly` cookie, `credentials: 'include'` on all requests
- Mobile: JWT stored in `expo-secure-store` (native) or `localStorage` (web), sent as `Authorization: Bearer <token>`
- Server middleware accepts both

---

## 15. Escalation Logic

```
Stars × deadline proximity → notification frequency

5★ contact, overdue                  → daily notifications
5★ contact, deadline ≤ 3 days        → high alert, daily
4★ contact, upcoming deadline        → escalating near deadline
3★ and below                         → standard cadence reminder
```

Escalation engine runs at server startup, then every hour.
Notifications are deduplicated — no duplicate type/contact/opportunity within time window.

---

## 16. Key Implementation Constraints

- **Status computation is intentionally duplicated** in `server/src/routes/contacts.js` AND `client/src/lib/utils.ts`. Keep both in sync.
- **Star → cadence mapping is intentionally duplicated** in server and client. Keep both in sync.
- **Route ordering matters** in Express: `PUT /read-all` before `PUT /:id/read`, `/pending-responses` before `/:id` in contacts.
- **Database migrations**: new columns go in `database.js` via `addCol()` (try/catch ALTER TABLE). Never alter column types or drop columns.
- **`computeStatus(lastContactDate, cadenceDays)`** — single function, same logic on both sides.
