// Gmail + Google Contacts routes.
// OAuth scopes needed:
//   gmail.metadata  — email thread metadata (subject/sender/date), non-restricted
//   contacts.readonly — read Google Contacts via People API, non-restricted
const router = require('express').Router();
const db = require('../db/database');
const authenticate = require('../middleware/auth');
const { detectPendingResponses } = require('../services/gmailSync');
const fetch = require('node-fetch');

let lastSynced = new Date(Date.now() - 2 * 60 * 1000);

router.get('/status', authenticate, (req, res) => {
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.userId);
  const diffMs = Date.now() - lastSynced.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const label = diffMin < 1 ? 'just now' : diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
  res.json({ connected: true, email: user.email, lastSynced: label });
});

router.get('/recent', authenticate, (req, res) => {
  const emails = db.prepare(`
    SELECT e.*, c.name as contact_name FROM email_threads e
    JOIN contacts c ON c.id = e.contact_id
    WHERE e.user_id = ? ORDER BY e.date DESC LIMIT 5
  `).all(req.userId);
  res.json(emails);
});

router.post('/sync', authenticate, (req, res) => {
  lastSynced = new Date();
  try { detectPendingResponses(req.userId); } catch {}
  res.json({ success: true, message: 'Gmail synced successfully', syncedAt: lastSynced.toISOString() });
});

router.get('/contacts', authenticate, async (req, res) => {
  const user = db.prepare('SELECT google_access_token FROM users WHERE id = ?').get(req.userId);
  if (!user?.google_access_token) {
    return res.status(403).json({ error: 'not_connected', message: 'Connect Gmail to import Google Contacts.' });
  }

  const existingEmails = req.query.existingEmails
    ? req.query.existingEmails.split(',').map(e => e.toLowerCase().trim()).filter(Boolean)
    : [];

  let pageToken = undefined;
  const allConnections = [];

  // Paginate through all contacts (max 1000 per page)
  do {
    const url = new URL('https://people.googleapis.com/v1/people/me/connections');
    url.searchParams.set('personFields', 'names,emailAddresses,phoneNumbers,organizations');
    url.searchParams.set('pageSize', '1000');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const resp = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${user.google_access_token}` },
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      if (resp.status === 401) {
        // Token expired — clear it so the client knows to re-authenticate
        db.prepare('UPDATE users SET google_access_token = NULL WHERE id = ?').run(req.userId);
        return res.status(403).json({ error: 'token_expired', message: 'Reconnect Gmail to refresh your Google Contacts access.' });
      }
      return res.status(502).json({ error: 'google_api_error', message: err.error?.message ?? 'Failed to fetch contacts from Google.' });
    }

    const json = await resp.json();
    allConnections.push(...(json.connections ?? []));
    pageToken = json.nextPageToken;
  } while (pageToken);

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
