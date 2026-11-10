// Google OAuth token lifecycle for the Gmail / People integration.
//
// Security model:
//  - The OAuth *client secret* lives only in the server env and is used only here.
//    The mobile app never sees it; it runs the user-facing auth-code + PKCE flow and
//    hands the server a one-time `code`, which we exchange for tokens.
//  - We request the minimum scopes (gmail.metadata, contacts.readonly, openid/email/
//    profile). gmail.metadata cannot read message bodies — by construction we can only
//    ever see headers (Subject/From/To/Date).
//  - Access + refresh tokens are encrypted at rest (see lib/tokenCrypto). The DB never
//    holds a usable plaintext token.
//  - redirect_uri is validated against an allowlist so a stolen client id can't be
//    pointed at an attacker-controlled callback.
//  - On disconnect we revoke the token at Google, not just delete our copy.

const db = require('../db/database');
const { encrypt, decrypt, isConfigured } = require('../lib/tokenCrypto');

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';

// Refresh a bit before the real expiry so an in-flight request never races the clock.
const EXPIRY_SKEW_MS = 60 * 1000;

function clientId() { return process.env.GOOGLE_CLIENT_ID; }
function clientSecret() { return process.env.GOOGLE_CLIENT_SECRET; }

// Comma-separated allowlist of redirect URIs the app is permitted to use.
function allowedRedirectUris() {
  return (process.env.GOOGLE_REDIRECT_URI || '')
    .split(',').map(s => s.trim()).filter(Boolean);
}

// The client secret is OPTIONAL: native (iOS/Android) OAuth clients have no secret and
// are protected by PKCE instead. It's only needed for a "Web application" client.
function isConfiguredForOauth() {
  return Boolean(clientId() && isConfigured());
}

function assertRedirectAllowed(redirectUri) {
  const allowed = allowedRedirectUris();
  // If no allowlist is configured we refuse rather than trust arbitrary input.
  if (allowed.length === 0) {
    throw new Error('GOOGLE_REDIRECT_URI is not configured on the server.');
  }
  if (!redirectUri || !allowed.includes(redirectUri)) {
    throw new Error('redirect_uri is not in the allowlist.');
  }
}

// Exchange a one-time auth code for tokens. Supports PKCE (code_verifier).
async function exchangeCodeForTokens({ code, codeVerifier, redirectUri }) {
  if (!code) throw new Error('Missing authorization code.');
  assertRedirectAllowed(redirectUri);

  const body = new URLSearchParams({
    code,
    client_id: clientId(),
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  // Web clients authenticate with a secret; native clients authenticate with PKCE.
  if (clientSecret()) body.set('client_secret', clientSecret());
  if (codeVerifier) body.set('code_verifier', codeVerifier);
  if (!clientSecret() && !codeVerifier) {
    throw new Error('token_exchange_failed:missing_pkce_or_secret');
  }

  const resp = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    // Surface Google's error code but never the raw response (may echo inputs).
    throw new Error(`token_exchange_failed:${json.error || resp.status}`);
  }
  // json: { access_token, expires_in, refresh_token?, scope, token_type, id_token? }
  return json;
}

async function refreshAccessToken(refreshToken) {
  if (!refreshToken) throw new Error('No refresh token available.');
  const body = new URLSearchParams({
    client_id: clientId(),
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  if (clientSecret()) body.set('client_secret', clientSecret());
  const resp = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(`token_refresh_failed:${json.error || resp.status}`);
  }
  // Note: a refresh response usually omits refresh_token; the old one stays valid.
  return json;
}

// Best-effort revocation at Google. Never throws — disconnect must always clear locally.
async function revokeToken(token) {
  if (!token) return;
  try {
    await fetch(REVOKE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }),
    });
  } catch {
    /* ignore — we still drop our copy */
  }
}

// Persist tokens for a user (encrypted). expiresIn is seconds from now.
function storeTokens(userId, { access_token, refresh_token, expires_in }) {
  const expiryMs = Date.now() + (Number(expires_in) || 0) * 1000;
  // Preserve an existing refresh token if Google didn't return a new one.
  const encRefresh = refresh_token
    ? encrypt(refresh_token)
    : db.prepare('SELECT google_refresh_token FROM users WHERE id = ?').get(userId)?.google_refresh_token;

  db.prepare(`
    UPDATE users
    SET google_access_token = ?, google_refresh_token = ?, google_token_expiry = ?
    WHERE id = ?
  `).run(encrypt(access_token), encRefresh ?? null, expiryMs, userId);
}

function clearTokens(userId) {
  db.prepare(`
    UPDATE users
    SET google_access_token = NULL, google_refresh_token = NULL, google_token_expiry = NULL
    WHERE id = ?
  `).run(userId);
}

function isConnected(userId) {
  const row = db.prepare('SELECT google_access_token FROM users WHERE id = ?').get(userId);
  return Boolean(row?.google_access_token);
}

// Return a usable access token for the user, refreshing transparently if expired.
// Returns null if the user has not connected Google. Throws only on hard failures
// (e.g. the refresh token was revoked) after clearing the now-dead tokens.
async function getValidAccessToken(userId) {
  const row = db.prepare(
    'SELECT google_access_token, google_refresh_token, google_token_expiry FROM users WHERE id = ?'
  ).get(userId);
  if (!row?.google_access_token) return null;

  const notExpired = row.google_token_expiry && row.google_token_expiry - EXPIRY_SKEW_MS > Date.now();
  if (notExpired) {
    return decrypt(row.google_access_token);
  }

  // Expired (or unknown expiry) — refresh.
  if (!row.google_refresh_token) {
    clearTokens(userId);
    throw new Error('reauth_required');
  }
  try {
    const refreshed = await refreshAccessToken(decrypt(row.google_refresh_token));
    storeTokens(userId, refreshed);
    return refreshed.access_token;
  } catch (err) {
    // invalid_grant means the user revoked access on Google's side — clear and signal.
    if (String(err.message).includes('invalid_grant')) clearTokens(userId);
    throw new Error('reauth_required');
  }
}

module.exports = {
  isConfiguredForOauth,
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeToken,
  storeTokens,
  clearTokens,
  isConnected,
  getValidAccessToken,
  // exposed for revoke-on-disconnect
  _decrypt: decrypt,
};
