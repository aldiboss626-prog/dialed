# Gmail / Google Auth — Progress Tracker

> **Status: PAUSED — resume Friday, Jun 19 2026** (payday → buy the Apple Developer account, $99/yr).
> This is the live "where we are / what's next" tracker. Deep detail on verification + the
> CASA security assessment lives in [GMAIL_API_VERIFICATION_PLAN.md](GMAIL_API_VERIFICATION_PLAN.md).

---

## ✅ Done (Google Cloud Console — project "Dialed")

- [x] Created the Google Cloud project (**Dialed**), owned by the Dialed Google account.
- [x] Enabled **Google People API** (contacts). **⚠️ Confirm Gmail API is also enabled** (search "Gmail" in API Library) — verify this Friday.
- [x] OAuth consent screen / **Audience** → status is **Testing**, test user(s) added (up to 100).
- [x] **Data Access** → 5 scopes added: `openid`, `userinfo.email`, `userinfo.profile`, `gmail.metadata` (restricted), `contacts.readonly` (sensitive).
- [x] Created the **Web application OAuth client** ("Web client 1") → got **Client ID + Client Secret**.

## 🔑 Credentials (stored OUTSIDE this repo — do NOT paste the secret here or commit it)
- **Client ID**: starts `387312538383-aqed...apps.googleusercontent.com` (saved in password manager / downloaded JSON).
- **Client Secret**: saved securely (password manager). It appeared in a screenshot + chat during setup → **rotate it before public launch** (Clients page → reset secret).
- When wiring the server, these become `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` env vars (server `.env` + Railway). Never in the mobile app, never in git.

---

## ▶️ RESUME HERE (Friday) — EAS iOS development build

Why: the iOS/Android OAuth clients + the real Gmail OAuth flow need the app to exist as a real build (can't run in Expo Go). Build runs in Expo's cloud — **no Mac needed**.

1. **Apple Developer account** — developer.apple.com → enroll as **Individual** ($99/yr). Slowest step (can take hours–2 days). Save the **Team ID** (10-char code) — needed for the iOS OAuth client.
2. **Expo + EAS CLI** (free): create account at expo.dev → `npm install -g eas-cli` → `eas login` → (in `mobile/`) `eas init` (adds the missing `projectId` to app.json).
3. **Build config** (Claude can prep this): `npx expo install expo-dev-client` → `eas build:configure` (creates `eas.json`). Bundle ID already `com.dialed.app`.
4. **Build**: `eas build --profile development --platform ios` → log in with Apple when prompted → EAS handles certs/provisioning → register the iPhone via the link it gives → install the build on the phone.
5. **Run**: `npx expo start --dev-client` → open the **Dialed** dev build (not Expo Go).

## ⬜ After the build
- [ ] Create the **iOS OAuth client** in Google (App type iOS, Bundle ID `com.dialed.app`, Team ID from Apple).
- [ ] (Claude) Wire the **"Connect Gmail"** flow in the app + the **server token-exchange endpoint** (`POST /api/google/connect`) using the Client ID/Secret → stores the refresh token → activates the real Gmail/People sync that powers the "you haven't replied" reminders.
- [ ] Test the full Gmail-reminder loop with test users.

## 💸 Costs pending
- **Apple Developer** — $99/yr (Friday).
- **CASA security assessment** — ~$500–$4,500/yr, only when going **public / past 100 users** (not needed for testing). See [GMAIL_API_VERIFICATION_PLAN.md](GMAIL_API_VERIFICATION_PLAN.md).

## 🧠 Key reminders
- You can run Gmail for **up to 100 test users with zero verification/CASA** — that's the whole testing phase.
- "Web application" client = your **server's** credential; it powers Gmail on **mobile** (the phone routes the token exchange through the server). It is NOT web-only.
- Verification + CASA is only the gate for public launch.
