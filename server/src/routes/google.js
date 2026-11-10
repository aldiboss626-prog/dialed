// Google account connect / disconnect.
//
// The mobile app runs the user-facing Google sign-in (auth code + PKCE) and posts the
// resulting one-time `code` here. The server — and only the server — holds the client
// secret and does the token exchange, then stores the tokens encrypted. This keeps the
// secret off the device entirely.
//
// NOTE: the mobile half of this flow needs a real dev build (Expo Go can't do native
// Google OAuth), so these endpoints are ready ahead of that build.

const router = require('express').Router();
const db = require('../db/database');
const authenticate = require('../middleware/auth');
const google = require('../services/googleOauth');

// POST /api/google/connect  { code, codeVerifier?, redirectUri }
router.post('/connect', authenticate, async (req, res) => {
  if (!google.isConfiguredForOauth()) {
    return res.status(503).json({
      error: 'oauth_not_configured',
      message: 'Google sign-in is not configured on the server yet.',
    });
  }

  const { code, codeVerifier, redirectUri } = req.body || {};
  if (!code || !redirectUri) {
    return res.status(400).json({ error: 'bad_request', message: 'code and redirectUri are required.' });
  }

  try {
    const tokens = await google.exchangeCodeForTokens({ code, codeVerifier, redirectUri });
    google.storeTokens(req.userId, tokens);

    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.userId);
    return res.json({ connected: true, email: user?.email ?? null });
  } catch (err) {
    const reason = String(err.message);
    if (reason.startsWith('redirect_uri')) {
      return res.status(400).json({ error: 'bad_redirect', message: 'Invalid redirect URI.' });
    }
    if (reason.startsWith('token_exchange_failed')) {
      return res.status(400).json({ error: 'exchange_failed', message: 'Could not complete Google sign-in. Please try again.' });
    }
    return res.status(500).json({ error: 'connect_failed', message: 'Could not connect Google.' });
  }
});

// POST /api/google/disconnect — revoke at Google, then clear locally.
router.post('/disconnect', authenticate, async (req, res) => {
  try {
    const row = db.prepare('SELECT google_refresh_token, google_access_token FROM users WHERE id = ?').get(req.userId);
    // Revoking the refresh token invalidates the whole grant; fall back to access token.
    const toRevoke = row?.google_refresh_token || row?.google_access_token;
    if (toRevoke) {
      try { await google.revokeToken(google._decrypt(toRevoke)); } catch { /* best effort */ }
    }
  } finally {
    google.clearTokens(req.userId);
    // Connected contacts no longer have a live source — mark them disconnected.
    db.prepare('UPDATE contacts SET gmail_connected = 0 WHERE user_id = ?').run(req.userId);
  }
  res.json({ connected: false });
});

module.exports = router;
