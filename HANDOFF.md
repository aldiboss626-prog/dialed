# Dialed — Device Handoff & Onboarding

> Read this first when picking up Dialed on a new machine (or a new Claude Code session).
> It covers: how Aldi works, what the app is, what's built vs. still a shell, what's left to do,
> and the exact steps to set up, run, and connect to git. Last updated: 2026-06-25.

---

## 0. ⚠️ Read before you clone

**All real work lives on the `v2-redesign` branch, not `master`.** `master` is just the original
v1 PWA (3 commits). Everything since — the v2 redesign, Bob the mascot, AI reply, business-card
scan, the referral system UI, the Settings icon system, the new onboarding — is on `v2-redesign`.

After cloning, **immediately**:
```bash
git checkout v2-redesign
```
If `v2-redesign` isn't on GitHub yet, it was never pushed — push it from the OLD device first
(see §7) or you will lose months of work.

**The `.env` files and the demo seeder are NOT in git** (they hold secrets). You must **hand-carry**
them from the old device — copy them onto a USB stick / private message / password manager. See §5.

---

## 1. How Aldi works (mindset — match this)

- **Solo founder, mobile-first.** The Expo mobile app is THE product. The web `client/` is frozen.
- **Wants the simple, direct thing.** When the ask is small ("open a terminal so I can scan the QR"),
  just do it — lead with the action, not analysis. Don't spiral into diagnostics or long explanations
  unless asked or something fails. (He has pushed back hard on over-complication before.)
- **Ships by feel.** He builds a screen, tests it on his phone, and iterates on look/vibe. He often
  says "I just wanna see it" — get something on screen, then refine. Backend can come later.
- **Premium taste.** Target feel = first-party Apple apps + Linear + Superhuman. One accent color,
  real device screenshots, no generic/AI-looking UI, no emoji-as-icons. Clean, confident, native iOS.
- **Course-corrects directly.** Expect blunt redirections ("No, I meant…"). Don't over-build past the
  ask — e.g. he wanted Add/Search as *panes*, not a whole new contacts page.
- **Voice/dictation.** Many messages are transcribed speech — read for intent, not literal punctuation.

When in doubt: do the minimal thing that satisfies the request, show it, and ask if he wants more.

---

## 2. What Dialed is

A personal relationship-manager / networking CRM — "turns your network into a pipeline." It nudges
you before a contact goes cold and drafts AI replies in your voice. Audience: students / early-career.
Free + **Pro at $9.99/mo** (or annual). The thesis: **proactive nudges are the core value.**

---

## 3. Repo structure

```
d:\Dialed\
├─ mobile/      ← PRIMARY. Expo SDK 54 + React Native 0.81 + TypeScript + expo-router. The app.
├─ server/      ← Express (port 3001). Anthropic AI proxy + auth gate + escalation engine.
├─ client/      ← Web PWA (Vite). FROZEN — don't invest here.
├─ lose stuff/  ← scratch; holds seed-demo.js (NOT in git — has service-role key)
├─ WEBSITE_SPEC.md       ← full marketing-site build spec + legal/privacy checklist
├─ DIALED_PROJECT_BRIEF.md, GMAIL_AUTH_PROGRESS.md  ← older context docs
└─ HANDOFF.md   ← this file
```

- **mobile** talks **directly to Supabase** (auth + Postgres) via `mobile/src/lib/db.ts` +
  `supabase.ts`. Supabase URL + anon key are hard-coded in `supabase.ts` (fine — anon key is public).
- **server** is only needed for **AI features** (reply drafts, business-card scan) and the
  escalation/notification engine. `/api/content/*` is Supabase-JWT auth-gated + rate-limited (40/day).
- **AI models** (in `server/src/routes/content.js`): replies + vision use `claude-sonnet-4-6`;
  lighter content uses `claude-haiku-4-5-20251001`.

---

## 4. What's built vs. still a shell (honest status)

**Built & working (UI + logic):**
- v2 **4-pane swipe shell** in `mobile/src/app/(tabs)/home.tsx` — Network · Inbox · Add · Search,
  finger-tracking swipe, floating pill tab bar.
- **Bob** the blob mascot (`components/Bob.tsx`) — animated, reacts to network health; used on Home,
  Profile, and throughout onboarding as a coach.
- **AI reply / compose** (`app/reply.tsx`) — paste text or a screenshot → Claude drafts a reply in
  your voice (learns from past sent replies).
- **Business-card scan** (`components/AddPane.tsx` + server `/api/content/scan-card`) — snap a card →
  Claude vision extracts name/title/company/email/phone → pre-fills the form.
- **Referral system — UI ONLY** (`app/upgrade.tsx`: `features → referral → redeem → trial`; plus an
  INVITE FRIENDS section in `app/settings.tsx`, Pro-gated). Reward = **2 friends on Pro = 1 free month.**
- **Settings icon system** — premium white-tile icons (`settings.tsx` `IconTile`).
- **Onboarding** (`app/onboarding.tsx`) — 12 steps; step 10 is the new "Picture one person who
  matters" reflection screen (replaced a fabricated stat).
- Profile/analytics page, thermostat dials, manual contact notes, account deletion, demo seeding.

**Still a shell / not real (the launch gaps):**
- **Payments are fake.** The whole paywall ends at `handleUpgrade`, which just flips a local
  AsyncStorage dev flag — nothing charges. No RevenueCat / IAP installed. `usePro` reads that flag.
- **Referral backend = none.** Codes are a client-side placeholder (`referralCodeFor` in settings.tsx),
  can collide, and aren't verified. No issuance / capture-at-signup / subscription check / month credit.
- **Gmail is partial.** Server has OAuth (`server/src/routes/gmail.js`), but the mobile Settings UI is
  hard-coded "Not connected" and Sync is a fake `setTimeout`. Outlook: discussed, not built.
- **Social auth** ("Continue with Apple/Google" in onboarding) = "Coming soon" alert.
- **Marketing website** not built (spec is in `WEBSITE_SPEC.md`). Privacy/Terms/Support pages are
  required for App Store + Gmail OAuth verification.

---

## 5. What needs to be done (priority order)

1. **Payments (RevenueCat)** — the real blocker. Install `react-native-purchases`, set up products in
   App Store Connect / Play Console, wire `usePro` to real entitlements, do an EAS dev build.
2. **Store + legal** — build the website (Privacy/Terms/Support), iOS permission usage strings
   (camera/photos/contacts), Play Data Safety, business-card-scan → Anthropic disclosure.
3. **Referral backend** — server-issued unique codes, capture referrer code at signup, verify the
   friend actually subscribed, credit the free month. Swap out `referralCodeFor`.
4. **Gmail wiring** — connect the mobile Settings UI to the real OAuth/sync (see `GMAIL_AUTH_PROGRESS.md`).
5. **Cleanup** — reconcile the Opportunity status TS type vs the DB constraint (TS allows
   Applied/Interview/Not Started; DB only Active/Waiting/Completed/Missed → can crash inserts); delete
   orphaned code from the 4-pane refactor (`/people` route, `AddContactModal`, `/search` route);
   device-test the card scan + push delivery.

---

## 6. New-device setup (download & run)

**Prereqs to install:**
- **Node.js** (this machine used v24; any current LTS 20+ is fine) + npm.
- **Git.**
- **Expo Go** app on your phone (App Store / Play) — for testing without a native build.
- Optional: **EAS CLI** (`npm i -g eas-cli`) for cloud builds; a code editor (VS Code).
- You do NOT need Xcode/Android Studio to run via Expo Go.

**Clone & install:**
```bash
git clone https://github.com/aldiboss626-prog/dialed.git
cd dialed
git checkout v2-redesign            # ← critical, not master

cd mobile  && npm install
cd ../server && npm install
cd ../client && npm install         # only if you touch the (frozen) web app
```

**Hand-carry the secret files (NOT in git — copy from old device):**
- `server/.env` → `PORT=3001`, `JWT_SECRET=<any random string>`,
  `ANTHROPIC_API_KEY=<from console.anthropic.com>`, `NODE_ENV=development`
- `mobile/.env` → `EXPO_PUBLIC_API_URL=http://<NEW-MACHINE-LAN-IP>:3001`
  (find the LAN IP with `ipconfig` → IPv4; update it whenever the network changes)
- `client/.env` → `VITE_API_URL=http://localhost:3001` (only if running the web client)
- `lose stuff/seed-demo.js` → the demo seeder (has the Supabase service-role key). Needed only to
  reset demo data.

**Run (two terminals):**
```bash
# terminal 1 — backend (AI features)
cd server && npm run dev            # http://localhost:3001

# terminal 2 — mobile
cd mobile && npx expo start         # scan the QR with Camera (iOS) / Expo Go (Android)
```
- **Demo login:** `demo@dialed.app` / `dialeddemo123` (Pro tier, seeded data).
- **Reset demo data:** from repo root, `cp "lose stuff/seed-demo.js" ./_seed-tmp.js && node _seed-tmp.js; rm -f _seed-tmp.js`
- **Typecheck:** `cd mobile && node ./node_modules/typescript/bin/tsc --noEmit` (use `node ./node_modules/...`,
  not `npx tsc`, which can hang fetching).

**Networking gotchas:**
- Phone and laptop must be on the **same Wi-Fi**. Update `mobile/.env` `EXPO_PUBLIC_API_URL` to the
  laptop's current LAN IP or AI calls fail.
- If the **old/new machine is Windows on ARM64**, `expo start --tunnel` is BROKEN (no win32-arm64 ngrok
  binary) — use plain LAN `npx expo start`. On x64/Mac, tunnel works fine and dodges Wi-Fi issues.

---

## 7. Git workflow

- **Remote:** `origin = https://github.com/aldiboss626-prog/dialed.git`
- **Default branch:** `master` (v1 only). **Active branch:** `v2-redesign` (all real work).
- Day to day: work on `v2-redesign`, commit, `git push`. Open PRs into `master` when you want to
  "release" a milestone.
- Push the branch the first time with: `git push -u origin v2-redesign`.
- The `.gitignore` now protects `.env`, `lose stuff/`, and `client/dist/` — keep secrets out of git.

---

## 8. Notes for the new Claude session

- Point your new Claude Code session at this file first.
- The previous machine's Claude **memory** (`~/.claude/projects/.../memory/`) does NOT transfer — this
  doc is the replacement summary. Recreate memories on the new machine as you go.
- Expo SDK 54 is current here (`mobile/AGENTS.md` mentions v56 docs — that note is aspirational;
  the installed SDK is 54). Verify versioned APIs against the installed SDK before coding.
- Don't `npx tsc` (hangs); run `node ./node_modules/typescript/bin/tsc --noEmit` from `mobile/`.
