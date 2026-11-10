# Server environment variables

Set these in `server/.env` (gitignored — never commit real values) and in Railway.

| Variable | Required | What it is |
|---|---|---|
| `PORT` | yes | HTTP port (default 3001). |
| `JWT_SECRET` | yes | Signs app session JWTs. Use a long random string in production. |
| `ANTHROPIC_API_KEY` | yes | Powers the AI draft/reply features. |
| `NODE_ENV` | yes | `development` or `production`. |
| `GOOGLE_CLIENT_ID` | for Gmail | The **iOS** OAuth client id (same value the app ships as `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`). |
| `GOOGLE_CLIENT_SECRET` | optional | Leave **blank** for a native (iOS) client — PKCE protects the code exchange. Only set it if you use a "Web application" client. |
| `GOOGLE_REDIRECT_URI` | for Gmail | Comma-separated allowlist of redirect URIs. Must match the app's `makeRedirectUri()` output exactly: `com.dialed.app://oauthredirect`. |
| `TOKEN_ENCRYPTION_KEY` | for Gmail | 32-byte hex (64 chars) key encrypting Google tokens at rest. Generate with `openssl rand -hex 32`. **Rotating this invalidates every stored Google token** (users must reconnect). |
| `GMAIL_SYNC_MINUTES` | no | Background Gmail sync interval in minutes (default 10). |
| `CORS_ORIGIN` | production | Comma-separated browser origins allowed by CORS in production (native app is unaffected — it sends no Origin). Unset in dev = allow all. |

## Security notes
- Google access/refresh tokens are stored **encrypted** (AES-256-GCM via `TOKEN_ENCRYPTION_KEY`), never as plaintext.
- The Gmail integration uses the **`gmail.metadata`** scope only — it physically cannot read message bodies, so no email content is ever fetched or stored.
- `GOOGLE_CLIENT_SECRET` lives only on the server. The mobile app does the user-facing auth-code + PKCE flow and never sees the secret.
- Before public launch: rotate the Google client secret (it was exposed during setup) and generate a fresh `TOKEN_ENCRYPTION_KEY` for production separate from dev.
