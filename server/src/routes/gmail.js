// Gmail + Google Contacts routes.
// OAuth scopes needed:
//   gmail.metadata  — email thread metadata (subject/sender/date), non-restricted
//   contacts.readonly — read Google Contacts via People API, non-restricted
const router = require('express').Router();
const db = require('../db/database');
const authenticate = require('../middleware/auth');
const { syncUser } = require('../services/gmailSync');
const google = require('../services/googleOauth');

// Per-user last-sync time. A single module-level Date here would leak one user's
// sync activity into every other user's "last synced" label.
const lastSyncedByUser = new Map(); // userId -> Date

function syncedLabel(userId) {
  const t = lastSyncedByUser.get(userId);
  if (!t) return 'not yet synced';
  const diffMin = Math.floor((Date.now() - t.getTime()) / 60000);
  return diffMin < 1 ? 'just now' : diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
}

router.get('/status', authenticate, (req, res) => {
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.userId);
  const connected = google.isConnected(req.userId);
  res.json({
    connected,
    email: connected ? user?.email ?? '' : '',
    lastSynced: connected ? syncedLabel(req.userId) : '',
  });
});

router.get('/recent', authenticate, (req, res) => {
  const emails = db.prepare(`
    SELECT e.*, c.name as contact_name FROM email_threads e
    JOIN contacts c ON c.id = e.contact_id
    WHERE e.user_id = ? ORDER BY e.date DESC LIMIT 5
  `).all(req.userId);
  res.json(emails);
});

router.post('/sync', authenticate, async (req, res) => {
  const result = await syncUser(req.userId);
  if (!result.ok && result.reason === 'reauth_required') {
    return res.status(403).json({ error: 'reauth_required', message: 'Reconnect Gmail to keep syncing.' });
  }
  const now = new Date();
  lastSyncedByUser.set(req.userId, now);
  res.json({ success: true, message: 'Gmail synced successfully', syncedAt: now.toISOString() });
});

router.get('/contacts', authenticate, async (req, res) => {
  // Get a valid access token, transparently refreshing if it expired.
  let accessToken;
  try {
    accessToken = await google.getValidAccessToken(req.userId);
  } catch {
    return res.status(403).json({ error: 'reauth_required', message: 'Reconnect Gmail to refresh your Google Contacts access.' });
  }
  if (!accessToken) {
    return res.status(403).json({ error: 'not_connected', message: 'Connect Gmail to import Google Contacts.' });
  }

  const existingEmails = req.query.existingEmails
    ? String(req.query.existingEmails).split(',').map(e => e.toLowerCase().trim()).filter(Boolean)
    : [];

  let pageToken = undefined;
  const allConnections = [];

  // Paginate through all contacts (max 1000 per page). The whole loop is wrapped:
  // Express 4 does NOT catch async throws, so an unhandled network error here would
  // crash the process instead of returning a 502.
  try {
    do {
      const url = new URL('https://people.googleapis.com/v1/people/me/connections');
      url.searchParams.set('personFields', 'names,emailAddresses,phoneNumbers,organizations');
      url.searchParams.set('pageSize', '1000');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const resp = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 401) {
          // Access token was rejected mid-flight — signal a reconnect.
          return res.status(403).json({ error: 'reauth_required', message: 'Reconnect Gmail to refresh your Google Contacts access.' });
        }
        return res.status(502).json({ error: 'google_api_error', message: err.error?.message ?? 'Failed to fetch contacts from Google.' });
      }

      const json = await resp.json();
      allConnections.push(...(json.connections ?? []));
      pageToken = json.nextPageToken;
    } while (pageToken);
  } catch {
    return res.status(502).json({ error: 'google_api_error', message: 'Could not reach Google. Try again in a moment.' });
  }

  const candidates = allConnections
    .map(person => {
      const name = person.names?.[0]?.displayName ?? '';
      if (!name) return null;
      const email = person.emailAddresses?.[0]?.value ?? undefined;
      const phone = person.phoneNumbers?.[0]?.value ?? undefined;
      const org = person.organizations?.[0];
      const role = [org?.title, org?.name].filter(Boolean).join(' · ') || undefined;
      const alreadyExists = email ? existingEmails.includes(email.toLowerCase()) : false;
      return { name, email, phone, role, alreadyExists };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  res.json(candidates);
});

module.exports = router;
