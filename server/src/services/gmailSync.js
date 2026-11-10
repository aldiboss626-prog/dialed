// Gmail sync — two stages:
//   1) fetchGmailMetadata: pull recent message HEADERS from Gmail for each known
//      contact and upsert them into email_threads.
//   2) detectPendingResponses: from those threads, work out which contacts are
//      waiting on a reply and create pending_responses records.
//
// Privacy / security by design:
//   - We use the Gmail API in format=metadata only (metadataHeaders=Subject,From,To,
//     Date). The gmail.metadata OAuth scope CANNOT return message bodies, so we never
//     receive — and never store — email content. body/preview stay empty.
//   - We only query for people who are already the user's contacts (with an email on
//     file). We do not enumerate the inbox or store data about unrelated third parties.
//   - All Google API calls use a short-lived access token fetched via googleOauth,
//     which transparently refreshes and is never logged.

const db = require('../db/database');
const { getValidAccessToken } = require('./googleOauth');

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me/messages';
const MAX_PER_CONTACT = 10;   // most recent N messages per contact per sync
const LOOKBACK = 'newer_than:60d';

function nowStr() {
  return new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
}

// Convert a header Date string to the 'YYYY-MM-DD HH:MM:SS' shape used elsewhere.
function toDbDate(headerDate) {
  const d = new Date(headerDate);
  if (isNaN(d.getTime())) return nowStr();
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
}

// Pull an email address out of a "Display Name <addr@x.com>" header value.
function extractEmail(headerValue) {
  if (!headerValue) return '';
  const m = headerValue.match(/<([^>]+)>/);
  return (m ? m[1] : headerValue).trim().toLowerCase();
}

function headerMap(payloadHeaders = []) {
  const map = {};
  for (const h of payloadHeaders) map[h.name.toLowerCase()] = h.value;
  return map;
}

async function listMessageIds(accessToken, query) {
  const url = new URL(GMAIL_BASE);
  url.searchParams.set('q', query);
  url.searchParams.set('maxResults', String(MAX_PER_CONTACT));
  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) {
    if (resp.status === 401) throw new Error('reauth_required');
    return [];
  }
  const json = await resp.json().catch(() => ({}));
  return (json.messages ?? []).map(m => m.id);
}

async function getMessageMetadata(accessToken, id) {
  const url = new URL(`${GMAIL_BASE}/${id}`);
  url.searchParams.set('format', 'metadata');
  for (const h of ['Subject', 'From', 'To', 'Date']) {
    url.searchParams.append('metadataHeaders', h);
  }
  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) {
    if (resp.status === 401) throw new Error('reauth_required');
    return null;
  }
  return resp.json().catch(() => null);
}

/**
 * Fetch recent message headers from Gmail for every contact the user has an email
 * for, and upsert them into email_threads. Returns { connected, fetched }.
 * Throws 'reauth_required' if the Google grant is no longer valid.
 */
async function fetchGmailMetadata(userId) {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return { connected: false, fetched: 0 };

  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
  const myEmail = (user?.email || '').toLowerCase();

  const contacts = db.prepare(
    "SELECT id, email FROM contacts WHERE user_id = ? AND email IS NOT NULL AND TRIM(email) != ''"
  ).all(userId);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO email_threads
      (contact_id, user_id, subject, sender, recipient, date, preview, body, is_from_user, gmail_message_id)
    VALUES (?, ?, ?, ?, ?, ?, '', '', ?, ?)
  `);

  let fetched = 0;
  for (const contact of contacts) {
    const email = contact.email.toLowerCase();
    const query = `(from:${email} OR to:${email}) ${LOOKBACK}`;

    let ids;
    try {
      ids = await listMessageIds(accessToken, query);
    } catch (err) {
      if (err.message === 'reauth_required') throw err;
      continue;
    }

    let sawAny = false;
    for (const id of ids) {
      // Dedupe: skip messages we've already stored for this user.
      const exists = db.prepare(
        'SELECT 1 FROM email_threads WHERE user_id = ? AND gmail_message_id = ?'
      ).get(userId, id);
      if (exists) { sawAny = true; continue; }

      const msg = await getMessageMetadata(accessToken, id);
      if (!msg) continue;
      const h = headerMap(msg.payload?.headers);
      const fromAddr = extractEmail(h.from);
      const isFromUser = myEmail && fromAddr === myEmail ? 1 : 0;

      insert.run(
        contact.id,
        userId,
        h.subject || '(no subject)',
        h.from || '',
        h.to || '',
        toDbDate(h.date),
        isFromUser,
        id,
      );
      fetched++;
      sawAny = true;
    }

    // Mark the contact as actively gmail-connected if we found correspondence.
    if (sawAny) {
      db.prepare('UPDATE contacts SET gmail_connected = 1 WHERE id = ? AND user_id = ?').run(contact.id, userId);
    }
  }

  return { connected: true, fetched };
}

/**
 * For each gmail-connected contact, scan email threads.
 * If the most recent email is FROM the contact and there is no
 * user reply after it, create a pending_responses record.
 * If a reply exists, mark any pending record as responded.
 */
function detectPendingResponses(userId) {
  const contacts = db.prepare(
    'SELECT * FROM contacts WHERE user_id = ? AND gmail_connected = 1'
  ).all(userId);

  for (const contact of contacts) {
    const emails = db.prepare(
      'SELECT * FROM email_threads WHERE contact_id = ? AND user_id = ? ORDER BY date DESC'
    ).all(contact.id, userId);

    if (emails.length === 0) continue;

    const mostRecent = emails[0];

    if (!mostRecent.is_from_user) {
      // Most recent email is FROM the contact — user needs to respond
      const userReply = emails.find(
        e => e.is_from_user && e.date > mostRecent.date
      );

      if (!userReply) {
        // No reply found — ensure a pending_responses record exists
        const existing = db.prepare(
          "SELECT id FROM pending_responses WHERE email_thread_id = ? AND user_id = ? AND status != 'dismissed'"
        ).get(mostRecent.id, userId);

        if (!existing) {
          db.prepare(`
            INSERT INTO pending_responses
              (user_id, contact_id, email_thread_id, detected_at, stars_at_detection, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
          `).run(userId, contact.id, mostRecent.id, nowStr(), contact.stars);

          try {
            db.prepare('UPDATE email_threads SET requires_response = 1 WHERE id = ?').run(mostRecent.id);
          } catch {}
        }
      } else {
        // User replied — mark any pending record as responded
        const pending = db.prepare(
          "SELECT id FROM pending_responses WHERE email_thread_id = ? AND user_id = ? AND status = 'pending'"
        ).get(mostRecent.id, userId);

        if (pending) {
          db.prepare(
            "UPDATE pending_responses SET status = 'responded' WHERE id = ?"
          ).run(pending.id);

          try {
            db.prepare(
              'UPDATE email_threads SET requires_response = 0, response_detected_at = ? WHERE id = ?'
            ).run(nowStr(), mostRecent.id);
          } catch {}

          // Log as a positive interaction
          db.prepare(
            "INSERT INTO interactions (contact_id, user_id, date, note, type) VALUES (?, ?, date('now'), 'Replied to email (detected by Gmail sync)', 'email')"
          ).run(contact.id, userId);
        }
      }
    }
  }
}

/**
 * Sync one user: fetch fresh metadata from Gmail (if connected), then detect.
 * Returns a small status object; never throws.
 */
async function syncUser(userId) {
  try {
    let connected = false;
    try {
      const r = await fetchGmailMetadata(userId);
      connected = r.connected;
    } catch (err) {
      if (err.message === 'reauth_required') {
        return { ok: false, reason: 'reauth_required' };
      }
      throw err;
    }
    detectPendingResponses(userId);
    return { ok: true, connected };
  } catch (err) {
    console.error(`Gmail sync error (user ${userId}):`, err.message);
    return { ok: false, reason: 'sync_error' };
  }
}

// Sync every user. Used by the periodic scheduler.
async function runGmailSync() {
  try {
    const users = db.prepare('SELECT id FROM users').all();
    for (const user of users) {
      await syncUser(user.id);
    }
  } catch (err) {
    console.error('Gmail sync error:', err.message);
  }
}

module.exports = { fetchGmailMetadata, detectPendingResponses, syncUser, runGmailSync };
