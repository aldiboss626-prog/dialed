# Dialed — Project Status & Context Brief

*Prepared by the founder (Aldi) to bring a strategy/business advisor up to speed. Last updated: 2026-06-17.*

> **How to use this doc:** This is a full snapshot of the Dialed app — what it is, what's built, what's left, and what it costs. I'm about to start the **website + business side** (go-to-market, pricing, legal, launch). Read this, then help me make good decisions on those. Technical detail is included so your advice is grounded in reality. The questions I most want help with are in **Section 8**.

---

## 1. What Dialed is

**One-liner:** Dialed is a mobile app that keeps your professional and personal relationships from going cold — it proactively tells you who to reach out to and drafts the message for you.

**The problem:** Most opportunities (jobs, internships, referrals, mentorship) come from people you already know — but those relationships quietly go silent, and you only notice once it's too late. People are bad at remembering to follow up, and starting the message feels awkward.

**The core belief (this is the product's soul):** *Notifications and nudges are the value.* The app should proactively say *"hey, you haven't replied to Sarah in 12 days — she's going cold"* and *"hit up Marcus about that Google referral before the deadline."* Everything else supports that.

**Who it's for:** College students and early-career people building a network — managing recruiters, mentors, professors, and peers. (The onboarding is built around internships, referrals, and "don't let the person who could refer you forget your name.")

**The "aha" loop:**
1. The app detects an email you haven't replied to (or a contact going cold).
2. It nudges you.
3. You open it → **AI drafts a reply in your voice** in one tap.
4. You send → that relationship's **health score** climbs back up.

---

## 2. Product — what exists today

The app is a **feature-complete MVP** and runs on a real phone (currently via Expo Go for testing). Built so far:

- **Contacts CRM** — people with relationship type (Mentor/Friend/Recruiter/Professor), cadence (how often you should reach out), notes, and a timeline/history.
- **Relationship health scoring** — every contact gets a 0–100 score based on how overdue they are; the home screen shows who needs attention this week.
- **Two-pane "Network · Inbox" interface (v2 redesign, just finished)** — swipe between your Network (who's going cold) and your Inbox (emails waiting on a reply). Signature animated "dial" gauges. No clutter.
- **AI reply drafting** — paste an email *or* upload a screenshot → the app drafts a ready-to-send reply that learns your voice over time from your past replies.
- **Pending-email inbox** — surfaces emails you owe a response to, sorted by urgency.
- **Manual notes & interaction history** per contact.
- **Profile/analytics page** — overall network health, your strongest connections, stats.
- **Onboarding flow** — a guided quiz that personalizes the experience and creates the account.
- **Settings, account deletion, demo account** for showing the app off.
- **Marketing landing screen inside the app** with a looping animated demo of the product in use.

There is a **working demo account** I can use to show anyone the full experience.

---

## 3. How it's built (plain-English architecture)

Three parts:

- **`mobile/` — the app (primary).** React Native via Expo (SDK 54). Talks directly to **Supabase** (handles login + the database). This is what users install.
- **`server/` — a small backend.** An Express server whose main job is to **proxy the AI** (Anthropic's Claude) so the AI key stays private. It's **auth-gated and rate-limited** (40 AI actions/user/day) so a leaked URL can't drain the AI budget.
- **`client/` — an old web version.** A web PWA, currently **frozen/not the focus**.

**AI models:** reply drafts use Claude **Sonnet 4.6** (higher quality, incl. reading screenshots); lighter text uses Claude **Haiku 4.5** (cheaper).

**Hosting status:** the backend currently runs on my laptop for testing. It needs to be deployed (planned: **Railway**) before handing the app to outside testers.

---

## 4. What's NOT done yet — the real launch blockers

These are the things between "works on my phone" and "strangers can download and pay for it":

1. **Payments aren't wired.** Pricing is designed as a **$9.99/month Pro tier**, but the purchase/restore buttons are placeholders. Real payments need the **RevenueCat** SDK + a real app build (see #2). The server-side webhook that flips a user to Pro is already written.
2. **No real app build yet (EAS).** The app is only running in **Expo Go** (a dev sandbox). Real **App Store / Play Store** builds — and push notifications and payments — require **EAS Build**. Not set up yet.
3. **Gmail integration is mocked.** Auto-detecting unanswered emails needs real **Google/Gmail OAuth**. The Google Cloud project is partly set up. **Important caveat:** Google requires **OAuth verification**, and for **public launch (>100 users)** a **paid third-party security assessment ("CASA")** — a real cost and time gate. It works for **≤100 test users without it.** *(The manual "paste the email" flow already works without Gmail, so Gmail is an enhancement, not a hard dependency.)*
4. **Backend not deployed** (Railway) — needed before external testers.
5. **Production hardening** — tighten CORS, rotate secrets, set a strong auth secret.

---

## 5. Money — what it costs to run / launch

- **Apple Developer account:** $99/year (planned to purchase ~Fri Jun 19). Required to ship on iOS.
- **Google Cloud / Gmail:** free to start; the **CASA security assessment** for public Gmail access is a **paid** gate (varies, often a few hundred $/yr) — only needed once past ~100 users.
- **Anthropic API (the AI):** pay-per-use. Already protected with per-user daily limits so costs stay bounded.
- **Supabase + Railway:** free tiers to start; cheap at small scale.
- **Monetization:** **$9.99/month Pro**, with a free tier. The exact free-vs-Pro split is being reworked alongside the v2 redesign.

**Context that matters for advice:** I'm a **solo founder**, **budget-conscious**, building lean. Prefer the cheapest viable path to a real launch.

---

## 6. Positioning (my current thinking — open to challenge)

- **Target:** students / early-career building a professional network.
- **Alternatives people use today:** spreadsheets, their memory, LinkedIn, or nothing.
- **Differentiator:** it's *proactive* (nudges you before relationships die) + *removes the friction* (AI writes the reply) + *makes it measurable* (health scores). It's not a generic CRM and not a contact list — it's a "don't let your network rot" app.

---

## 7. Where I am right now & immediate next steps

- **Just finished:** the v2 two-pane redesign + a polish pass + the animated landing demo; currently testing on my phone.
- **About to start:** the **website + business side** (this is why I'm writing this doc).
- **Near-term technical sequence:** Apple Developer account (Fri) → first real EAS build → wire Gmail OAuth → wire RevenueCat payments → deploy backend.

---

## 8. Where I want your guidance (the important part)

**Website / web presence**
- Do I need a full **marketing website**, or is an App Store listing + a simple one-page site enough to start?
- What must the site actually contain? (Note: Google's OAuth verification **requires** a public homepage describing the app, plus a **Privacy Policy** and an explanation of why I use Gmail scopes.)

**Legal (also a launch gate)**
- I have **no Privacy Policy or Terms of Service yet.** These are **required** for both the App Store and Gmail verification. The privacy policy must disclose that **email content is sent to a third-party AI provider (Anthropic) to generate drafts.** What's the minimum viable, legitimate way to get these — a generator, a template, a lawyer?

**Pricing & packaging**
- Is **$9.99/month** right for a student audience? Should there be an **annual** option, a **free trial**, or a more generous free tier? What belongs in Free vs Pro?

**Go-to-market**
- How do I actually reach **college students / early-career** users cheaply? (Campus, communities, social, referrals?) What's a realistic first-100-users plan?

**Launch sequencing**
- Should I launch **without Gmail** first (manual paste flow works, avoids the CASA cost/time), and add Gmail later? **TestFlight beta** before public?

**Brand**
- Anything to flag on the name "Dialed," domain, and basic brand presence?

---

*Tech stack one-liner for reference: Expo / React Native (app), Express + Anthropic Claude (AI backend), Supabase (auth + database). Solo founder, pre-launch.*
