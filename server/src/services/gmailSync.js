const db = require('../db/database');

function nowStr() {
  return new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
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

function runGmailSync() {
  try {
    const users = db.prepare('SELECT id FROM users').all();
    for (const user of users) {
      detectPendingResponses(user.id);
    }
  } catch (err) {
    console.error('Gmail sync error:', err.message);
  }
}

module.exports = { detectPendingResponses, runGmailSync };
