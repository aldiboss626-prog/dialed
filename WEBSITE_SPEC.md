# Dialed - Marketing Website Build Spec ("Cal AI style")

*A complete handoff for whoever builds the site. Everything you need: design read, stack, tokens, page structure, per-section specs, motion, assets, copy, SEO, legal/privacy policies, and the anti-generic guardrails. Last updated: 2026-06-22 (added the business-card scanner data flow + a master launch checklist).*

---

## 0. Design Read (start here)

**Reading this as:** a premium-consumer mobile-app landing page for students / early-career users, with an Apple-clean, friendly-premium language (the Cal AI / RevenueCat-app-site family), leaning toward **Next.js + Tailwind v4 + Motion**, an **off-white base with a single electric-blue accent**, and **real app screenshots inside iPhone device frames** as the primary visual.

**What "like Cal AI" actually means (the reference pattern):**
- Clean, bright, lots of white space. One accent color. Rounded, friendly, premium.
- The product is shown as **real phone screenshots in device frames**, not described in text.
- Big confident headline, one-line value prop, **App Store + Google Play badges** up top.
- A star rating + press/social-proof strip right under the hero.
- Alternating feature sections, each anchored by a phone screenshot.
- Testimonials, simple pricing, FAQ accordion, a final download CTA, a tidy footer.
- It feels like an extension of the app, not a generic SaaS template.

### Three dials (premium-consumer preset)
- **DESIGN_VARIANCE: 7** - asymmetric hero and feature layouts, not centered-everything.
- **MOTION_INTENSITY: 6** - tasteful scroll-reveals, a live phone demo, hover feedback. Not a cinematic scroll-hijack.
- **VISUAL_DENSITY: 3** - airy, generous section padding, one idea per section.

---

## 1. Tech stack (recommended)

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | **Next.js (App Router, React Server Components)** | SEO, fast first paint, easy OG/metadata. Static-export friendly. |
| Styling | **Tailwind v4** | Use `@tailwindcss/postcss` (not the old `tailwindcss` postcss plugin). |
| Animation | **Motion** (`import { motion } from "motion/react"`) | Isolate any animated piece in a `"use client"` leaf component. |
| Fonts | **next/font**, self-hosted | DM Sans + Cormorant Garamond (see Section 3). Never `<link>` Google Fonts in prod. |
| Icons | **@phosphor-icons/react** | One family, `weight="regular"` or `"bold"`, consistent. No hand-drawn SVG icons. |
| Hosting | **Vercel** | Free tier is plenty; preview deploys per PR. |
| Analytics | Vercel Analytics or **Plausible** | Lightweight, privacy-friendly (matters for your privacy story). |
| Forms (waitlist/contact) | Formspree / Vercel form + Resend | Only if you add an email capture. |

Single design system, single accent, single type system across the whole page. No mixing libraries.

---

## 2. Color tokens (lock these, use everywhere)

Dialed's accent is **electric blue**. One accent, used identically on every section (CTA, links, highlights). Neutrals are cool-to-neutral grays, off-white background, off-black ink. No pure `#000` or `#fff`.

```
/* Brand */
--accent:            #2563EB;   /* Dialed blue - the ONLY accent */
--accent-press:      #1D4ED8;   /* hover/active */
--accent-tint:       #EAF0FE;   /* light fills, chips, soft cards */

/* Light mode (default) */
--bg:                #FBFCFD;   /* off-white page */
--surface:           #FFFFFF;   /* cards */
--ink:               #0E1726;   /* near-black headings/body */
--muted:             #5B6573;   /* secondary text */
--faint:             #98A2B3;   /* captions, meta */
--hairline:          #ECEFF3;   /* borders, dividers */

/* Status (used sparingly, only where it means something) */
--good:              #16A34A;
--warn:              #F59E0B;
--cold:              #EF4444;
```

**Dark mode (optional but recommended, since the app has it):** off-black base (`#0B0F17`), surfaces `#121823`, ink `#E7ECF3`, same blue accent (keep it recognizable, do not desaturate). Lock one theme per page; do not flip a section to the other mode mid-scroll.

**Accent discipline:** the blue is the only accent. No second color creeping in for a badge or a gradient. Status colors appear only in the product screenshots and in any "health score" visual, not as decoration.

---

## 3. Typography

Dialed's brand already uses **Cormorant Garamond** (display serif) + **DM Sans** (UI). Keep that for brand continuity; it is the signature that separates Dialed from generic AI-sans sites. Use the serif **only** for large display headlines, never for body or mixed mid-sentence emphasis.

| Role | Font | Usage |
| --- | --- | --- |
| Display / hero + section headlines | **Cormorant Garamond**, 600-700 | Big editorial headlines only. `tracking-tight`, `leading-[1.05]`. |
| UI, body, labels, buttons, nav | **DM Sans**, 400/500/700 | Everything else. `leading-relaxed`, body `max-w-[60ch]`. |
| Numbers / health scores (optional) | DM Sans 700 | Keep numerals consistent with the app. |

Emphasis inside a headline: use **italic or weight of the same font**, never inject a different family.

**Alt option if you want it fully "Cal-AI-clean" (all sans):** swap the Cormorant display for a tight modern grotesk (Cal Sans, Cabinet Grotesk, or Geist) and keep DM Sans for body. This loses some brand identity but matches the reference more literally. *Default recommendation: keep Cormorant for headlines.*

Type scale (desktop): hero `text-5xl md:text-6xl`, section headline `text-4xl md:text-5xl`, body `text-base md:text-lg`, eyebrow/labels `text-sm`.

---

## 4. Shape, shadow, spacing

- **Radius:** soft and consistent. Cards `rounded-2xl` (16px), buttons full-pill (`rounded-full`), inputs `rounded-xl`. Pick this scale and never mix square cards with pill buttons randomly.
- **Shadows:** tint to the background, never pure black. Cards: `shadow-[0_12px_40px_rgba(14,23,38,0.06)]`. Device mockups get a deeper, softer one.
- **Spacing rhythm:** airy. Sections `py-24 md:py-32`. Page container `max-w-[1200px] mx-auto px-5 md:px-8`. Hero may go wider.
- **Hero height:** `min-h-[100dvh]` is optional; do **not** use `h-screen` (mobile address-bar jump). Hero content must be visible without scrolling, top padding max `pt-24`.

---

## 5. Asset checklist (what you must produce)

The site lives on **real visuals**. No `<div>` fake phone screens, no hand-drawn SVG illustrations.

1. **App screenshots (the hero of the whole site).** Capture the real v2 app screens at clean state, then drop them into **iPhone device frames**:
   - Network pane (health dial + needs-attention)
   - Inbox pane (waiting on you)
   - AI reply / compose screen (the draft)
   - Contact detail
   - Profile / analytics dial
   Provide each at @2x/@3x, PNG, transparent or on `--surface`.
2. **Optional: a live web port of the in-app animated demo.** The app already has `AnimatedPhoneDemo` (Home banner -> Inbox -> AI reply -> health grows, looping). Porting that to the web hero (Motion or a short muted autoplay loop video) gives the same "it moves" feel Cal AI has. High impact, worth it.
3. **App Store + Google Play badges.** Use the official badge art from Apple / Google (do not redraw them).
4. **Logo / wordmark.** The "dialed." wordmark (Cormorant, blue "al"). Provide SVG, light and dark variants.
5. **Favicon + app icons** (from the app icon).
6. **OG / social share image** (1200x630): wordmark + one phone + the tagline, on `--bg`.
7. **Press / "as seen in" logos** only if real. If you do not have press yet, use a **star rating + user count** strip instead of fake logos. Do not invent press logos.

If a visual is not ready, leave a labeled placeholder slot (`<!-- TODO: Inbox screenshot, 390x844 @3x -->`) and list it, rather than faking it with divs.

---

## 6. Page structure (sections, in order)

A Cal-AI-style single page. At least 4 different layout families across the sections (no repeating the same image+text split more than twice in a row).

1. **Nav** - single line, <=72px tall. Left: wordmark. Right: a few anchor links (Features, Pricing, FAQ) + one primary CTA ("Get the app"). Collapses to a hamburger under `md`.
2. **Hero** - asymmetric split. Left: eyebrow (optional), headline (<=2 lines), subtext (<=20 words), App Store + Play badges. Right: the phone (static screenshot or the live animated demo). One small text element max in the hero.
3. **Social proof strip** - directly under hero. Star rating + "Loved by N students" + (real press logos if any). Logos only, no captions. This sits UNDER the hero, never inside it.
4. **The problem (one calm section)** - one line that names the pain ("Your best connections go cold without you noticing"). Minimal, sets up the product.
5. **How it works - 3 steps** - varied layout (not three identical cards). For example a horizontal 3-step row with a connecting line, each step a verb: "Spot who's going cold" / "Tap to draft a reply" / "Stay top of mind." Each step gets a small phone crop.
6. **Feature: Proactive nudges** - asymmetric image+text. The core value: it tells you who to reach out to and when. Phone screenshot of the Network pane.
7. **Feature: AI drafts the reply** - reverse the split. Phone screenshot of the reply screen mid-draft. This is the "wow."
8. **Feature: Relationship health** - a bento-style block or a different layout (break the zigzag here). Show the dial / score, "see your whole network at a glance."
9. **Live demo / video** - the looping app demo, full-width, captioned simply ("A day in Dialed").
10. **Testimonials** - 2-3 short quotes (<=3 lines each), realistic names + roles (e.g. "Junior, CS @ UC Berkeley"). Real typographic quotes, no em-dashes, attribution always has name + role.
11. **Pricing** - Free vs Pro ($9.99/mo). Two clean columns, Pro highlighted with the accent. List what's in each. One CTA per column.
12. **FAQ** - accordion. Cover: "Is my email private?", "What happens to a business card I scan?", "Do I need Gmail?", "How does the AI write like me?", "Is there a free version?", "What platforms?".
13. **Final CTA** - one screen, headline + App Store/Play badges. Single download intent.
14. **Footer** - wordmark, nav links, social, and (important) **Privacy Policy + Terms** links, contact email, copyright. These legal links are required for the App Store and Gmail OAuth verification, so wire them now even as placeholders.

---

## 7. Per-section detail (the important ones)

### Hero
- **Layout:** 12-col grid, content `col-span-6` left, phone `col-span-6` right (stack to single column under `md`, phone below copy).
- **Copy:** headline 3-6 words so it can be `text-6xl`. Subtext <=20 words. CTAs = the two store badges (those count as the CTA; do not add a third button).
- **Visual:** the live animated phone demo if ported, else the Inbox screenshot in a device frame, slight tilt optional (keep subtle at VARIANCE 7).
- **Motion:** headline + subtext fade-up on load (stagger ~60ms), phone slides/fades in from the right. Honor reduced-motion (static).
- **Mobile:** single column, copy first, phone below, badges full-width-ish and tappable.

### "AI drafts the reply" feature (the wow section)
- Reverse split (phone left, copy right) to break the zigzag from the previous section.
- Show the reply screen with the "Generating reply..." or a finished draft visible in the screenshot.
- Copy angle: "Paste the email or snap a screenshot. Dialed writes a reply in your voice. Send in one tap." Concrete, no filler verbs.
- Motion: the screenshot reveals on scroll (`whileInView`, once). If you ported the demo, this is where a short draft-typing loop shines.

### Pricing
- Two columns. Free (the hook) and Pro ($9.99/mo, accent border + "Most popular" pill).
- One CTA intent only across the page ("Get the app" / store badges); pricing CTAs route to the same download, not a separate "Buy" flow (purchases happen in-app via the store).
- No giant feature matrix. 4-6 bullet lines per tier.

### FAQ
- Accordion (Phosphor `CaretDown`, rotates on open, Motion height). One open at a time is fine.
- The privacy answer matters: be honest that email content **and any business-card photo you scan** are sent to an AI provider (Anthropic) to generate drafts / read the card, are not sold, and the card image is not stored after the details are extracted. This doubles as trust-building and supports your privacy policy.

---

## 8. Motion plan (motivated only)

Every animation must earn its place (hierarchy, storytelling, feedback). At MOTION_INTENSITY 6:
- **Hero:** load-in fade-up stagger + phone entrance. The live demo loop (if used) is the centerpiece.
- **Sections:** `whileInView` reveal (opacity + 16-24px y), `once: true`, ease `[0.16, 1, 0.3, 1]`, ~0.5s. Stagger lists 60ms.
- **Buttons/badges:** `:active` press (`scale-[0.98]`), subtle hover lift on the primary CTA.
- **No** scroll-hijack, no parallax, no marquee spam (max one marquee on the page, and you probably need zero).
- **Reduced motion:** wrap everything above MOTION 3 in `useReducedMotion()` and degrade to static. Mandatory.
- Animate only `transform` and `opacity`. Never animate width/height/top/left.

---

## 9. Responsive

- Breakpoints: `sm 640 / md 768 / lg 1024 / xl 1280`.
- Every multi-column section declares its `< md` single-column collapse explicitly. Use CSS Grid, not flex percentage math.
- Hero, features: stack to one column on mobile, image below copy.
- Tap targets >=44px. Store badges large and thumb-reachable.
- Test the phone mockups do not overflow on small screens (`max-w-full`).

---

## 10. SEO, metadata, performance

- **Metadata:** title `Dialed - keep your network warm`, meta description (<=155 chars), canonical URL.
- **Open Graph + Twitter card:** the 1200x630 share image, `og:title`, `og:description`, `twitter:card=summary_large_image`.
- **Structured data:** `SoftwareApplication` JSON-LD (name, category, rating, price). Helps app-store-style rich results.
- **Smart App Banner (iOS):** `<meta name="apple-itunes-app" content="app-id=XXXX">` once you have an App Store ID, so Safari shows a native "Open in App Store" banner.
- **Core Web Vitals targets:** LCP < 2.5s (hero image as `next/image priority` or preloaded; if the demo is a video, poster-frame it), INP < 200ms, CLS < 0.1 (reserve image/font space).
- **Fonts:** `font-display: swap`, preload the hero display font.
- Run Lighthouse before shipping.

---

## 11. Legal, privacy & data policies (do not skip)

Dialed handles personal data (the user's whole network) and sends some of it to third-party AI. The website is also the public home that the Apple App Store, Google Play, and Google's Gmail OAuth review will inspect. Treat this section as a hard requirement, not a nice-to-have. Build the `/privacy`, `/terms`, and `/support` routes on day one (placeholder copy is fine to start, but the structure and links must be live) and link Privacy + Terms in the footer of every page.

### 11.1 Required public pages
- [ ] `/privacy` - Privacy Policy (the big one; see 11.3).
- [ ] `/terms` - Terms of Service.
- [ ] `/support` - Support / contact page with a real, reachable email (e.g. `support@dialed.app`).
- [ ] Account + data deletion path documented on the web (a clearly labeled section in `/privacy` or a `/data-deletion` route). The app already deletes the account + all data via the admin API with `ON DELETE CASCADE`; mirror and describe that on the site. Apple and Google both require an account-deletion path.

### 11.2 Third-party processors (name each one in the policy)
The privacy policy must name every service that touches user data and why. One row per processor; add a row whenever you add a service.

| Processor | What it receives | Why |
| --- | --- | --- |
| **Anthropic (Claude API)** | Email text and/or email screenshots; **business-card photos**; the other AI-generation inputs | Drafts replies in the user's voice and extracts contact details from a scanned card. Processed per-request; Dialed does not store these beyond the request. |
| **Supabase** | Account (email + auth) and all saved network data (contacts, titles, companies, emails, phones, notes, interactions) | App database + authentication. |
| **Google (Gmail API)** | OAuth token + the email content of the connected mailbox | Only if the user connects Gmail. Powers the inbox + reply flow. |
| **Expo (push service)** | Device push token | Delivers follow-up reminder notifications. |
| **Hosting / analytics** (Vercel/Railway, Plausible or Vercel Analytics) | Standard request metadata | Serving the site/API; privacy-friendly analytics only. |

### 11.3 What the Privacy Policy must disclose (clause checklist)
- [ ] **What data is collected:** account (email), saved network/contact data, email content (for drafts), business-card images (for scanning), device push token.
- [ ] **How it's used:** drafting replies, extracting contact details from cards, sending reminders, running the app.
- [ ] **Who it's shared with:** name Anthropic, Supabase, Google, and Expo (reference the 11.2 table). State that data is **not sold**.
- [ ] **AI processing disclosure:** email content and business-card photos are sent to Anthropic to generate drafts / read cards; not used to train models on a retained basis; not stored by Dialed after the request.
- [ ] **Image handling:** a scanned card image is processed transiently and is **not stored** after the details are extracted; only the fields the user reviews and saves are kept.
- [ ] **Gmail Limited Use statement** (if Gmail is connected): list the scopes used and state that Dialed's use of Google user data complies with the Google API Services User Data Policy, including the **Limited Use** requirements.
- [ ] **Data retention + deletion:** how long data is kept and how the user deletes their account + data.
- [ ] **Children:** the app is not directed at children under 13 (or your chosen minimum age).
- [ ] **Security:** data is encrypted in transit; Supabase row-level security protects per-user data.
- [ ] **User rights:** access, export, and deletion, plus the contact email to exercise them.
- [ ] **Effective date** + how changes to the policy are communicated.

### 11.4 Mobile permissions (iOS usage strings + Play Data Safety)
Each OS permission needs a plain-English purpose string in the iOS `Info.plist` and a matching Google Play Data Safety entry. Keep the website privacy policy consistent with these.
- [ ] **Camera** (`NSCameraUsageDescription`): "Dialed uses the camera so you can scan a business card and auto-fill a new contact." *(new - the card scanner.)*
- [ ] **Photo Library** (`NSPhotoLibraryUsageDescription`): "Dialed lets you pick a photo of a business card or an email screenshot so it can read the details for you."
- [ ] **Contacts** (`NSContactsUsageDescription`): "Dialed can import people from your contacts so you don't have to add them by hand. Your contacts aren't uploaded in bulk or sold."
- [ ] **Notifications:** reminders to follow up before a connection goes cold.

### 11.5 The business-card scanner, specifically (new data flow)
Because the scanner is new, call it out explicitly so reviewers and users understand it:
- The card photo is captured from the camera or chosen from the library, sent to Anthropic to extract name / title / company / email / phone, and used only to pre-fill the Add Connection form for the user to review.
- Dialed does **not** store the card image after extraction; only the fields the user confirms and saves are kept.
- Disclose it in three places: the privacy policy (under "images you provide"), the App Store / Play data-safety forms, and ideally a one-line note on the scan screen itself.

### 11.6 Why this is gating
- **Apple App Store:** a privacy policy URL and an account-deletion path are required to pass review.
- **Google Play:** the Data Safety form must match what the app actually does (camera, photos, contacts, data shared with Anthropic/Google).
- **Google Gmail OAuth verification:** requires a public homepage describing the app and a privacy policy that explains the Gmail scopes and complies with Google's Limited Use rules. Without these, Gmail stays stuck on the "unverified app" screen.

---

## 12. Anti-generic guardrails (so it does not look AI-built)

These are the specific things that make app landing pages look templated. Avoid all of them:
- **One accent color, locked.** The blue is the only accent on the whole page. No surprise teal badge in the footer.
- **Real screenshots in device frames.** Never `<div>`-based fake phone UIs. Never hand-drawn SVG "illustrations."
- **No three identical feature cards in a row.** Alternate layouts; break the zigzag after two splits (use the bento/health section to break it).
- **Hero discipline.** Headline <=2 lines, subtext <=20 words, store badges as the only CTA, one small text element max. No trust micro-strip or tagline crammed into the hero.
- **Eyebrows rationed.** At most one small uppercase label per ~3 sections, not above every headline.
- **No em-dashes anywhere** (headlines, body, captions, buttons). Use periods, commas, or hyphens.
- **No fake precision / filler.** No invented "92% faster" stats, no "Elevate / Seamless / Unleash / Next-Gen." Concrete verbs, real numbers only.
- **Realistic testimonial names + roles**, never "John Doe." Real typographic quotes, <=3 lines.
- **Logo walls are logos only** (no category labels under them), and only if the press is real.
- **One theme per page**; do not invert a section.
- **Buttons readable** (WCAG AA): blue button + white text, never white-on-white or text that wraps to two lines.

---

## 13. Copy bank (starters, grounded in the real product)

Use these as a starting point; tighten to brand voice. All within hero discipline.

**Hero headline options (pick one, keep it short):**
- "Never let a connection go cold."
- "Your network, actually maintained."
- "Stay close to the people who matter."

**Hero subtext (<=20 words):**
- "Dialed reminds you who to reach out to and drafts the message in your voice. Keep every relationship warm."

**Section headlines:**
- Nudges: "It tells you who's going cold."
- AI reply: "Then it writes the reply for you."
- Health: "See your whole network at a glance."

**How-it-works steps (verbs, no "Step 1:" labels):**
- "Spot who needs you" / "Draft a reply in one tap" / "Stay top of mind."

**Final CTA:** "Keep your network warm." + store badges.

Avoid: "Revolutionize your networking," "Seamlessly elevate your connections," and any em-dash.

---

## 14. Build order (suggested)

1. Scaffold Next.js + Tailwind v4 + fonts + tokens. Ship the nav + footer + legal routes first (gets the legal links live for store/OAuth).
2. Hero (static screenshot first; swap in the live demo later).
3. Social proof + how-it-works + the three feature sections.
4. Pricing + FAQ + final CTA.
5. Motion pass (reveals, hero entrance, reduced-motion).
6. SEO/OG/metadata + Lighthouse + responsive QA in both themes.

---

## 15. Master launch checklist (the main things it must have)

Tick every box before calling the site done. Grouped so you can split the work.

### Pages & routes
- [ ] Single-page landing with all sections from Section 6 in order.
- [ ] `/privacy`, `/terms`, `/support` routes live (placeholder copy OK to start, structure final).
- [ ] Account + data deletion documented (in `/privacy` or `/data-deletion`).
- [ ] Footer links Privacy + Terms + Support on every page.

### Legal & privacy (hard requirements - see Section 11)
- [ ] Privacy Policy covers all clauses in 11.3 (data collected, use, sharing, AI processing, image handling, Gmail Limited Use, retention/deletion, children, security, user rights, effective date).
- [ ] All third-party processors named: Anthropic, Supabase, Google, Expo (11.2).
- [ ] **Business-card scanner data flow disclosed** (image sent to Anthropic, not stored after extraction - 11.5).
- [ ] Email-content-to-AI disclosure present.
- [ ] Gmail Limited Use paragraph present (for OAuth verification).
- [ ] iOS permission usage strings written for Camera, Photos, Contacts, Notifications (11.4).
- [ ] Google Play Data Safety form matches the actual data flows.

### Brand & design system
- [ ] One accent (`#2563EB`) locked across the whole page; no second accent.
- [ ] DM Sans + Cormorant Garamond, self-hosted via `next/font`; serif for display headlines only.
- [ ] One radius scale, one shadow style (tinted, never pure black), consistent spacing rhythm.
- [ ] One theme per page (light or dark, not flipped mid-scroll).

### Assets
- [ ] Real app screenshots in iPhone device frames (Network, Inbox, AI reply, Contact detail, Profile) - no `<div>` fake phones.
- [ ] App Store + Google Play badges (official art).
- [ ] Logo / wordmark (SVG, light + dark), favicon + app icons.
- [ ] OG/social share image (1200x630).
- [ ] (Optional, high impact) live web port of the in-app animated demo for the hero.

### SEO & metadata
- [ ] Title + meta description (<=155 chars) + canonical URL.
- [ ] Open Graph + Twitter card with the share image.
- [ ] `SoftwareApplication` JSON-LD structured data.
- [ ] `apple-itunes-app` smart banner meta (once App Store ID exists).

### Accessibility & motion
- [ ] All CTAs pass WCAG AA contrast; no white-on-white, no two-line button wrap.
- [ ] Tap targets >=44px; store badges thumb-reachable.
- [ ] All motion above MOTION 3 wrapped in `useReducedMotion()` and degrades to static.
- [ ] Animate only `transform` / `opacity`.

### Pre-ship QA
- [ ] Responsive pass: every multi-column section collapses cleanly under `md`; phone mockups don't overflow.
- [ ] Lighthouse run: LCP < 2.5s, INP < 200ms, CLS < 0.1.
- [ ] Anti-generic guardrails (Section 12) all satisfied: no em-dashes, no fake stats, no three identical cards, realistic testimonials.

---

*Reference brand facts for the dev: name "Dialed"; accent `#2563EB`; type DM Sans + Cormorant Garamond; target users students / early-career; the product is a relationship app that nudges you before contacts go cold, drafts AI replies in your voice, and scans business cards to add contacts. Pricing: Free + Pro at $9.99/mo (purchased in-app via the stores).*
