const db = require('../db/database');

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dl = new Date(dateStr);
  dl.setHours(0, 0, 0, 0);
  return Math.ceil((dl - today) / 86400000);
}

function shouldNotifyOpportunity(stars, daysUntil) {
  if (daysUntil === null) return false;
  if (stars === 5) {
    if (daysUntil <= 1) return true;
    if (daysUntil <= 3) return true;
    if (daysUntil <= 7) return true;
    if (daysUntil <= 14) return true;
  } else if (stars === 4) {
    if (daysUntil <= 1) return true;
    if (daysUntil <= 3) return true;
    if (daysUntil <= 7) return true;
  } else if (stars === 3) {
    if (daysUntil <= 1) return true;
    if (daysUntil <= 3) return true;
  } else if (stars === 2) {
    if (daysUntil <= 1) return true;
  }
  return false;
}

function getEscalationLabel(stars, daysUntil) {
  if (!daysUntil || daysUntil > 7) return 'Single';
  if (daysUntil <= 1 && stars >= 4) return 'Daily';
  if (daysUntil <= 3 && stars >= 3) return 'Every 2 days';
  return 'Single';
}

function runEscalation() {
  try {
    const users = db.prepare('SELECT id FROM users').all();

    for (const user of users) {
      // Cadence overdue notifications
      const contacts = db.prepare('SELECT * FROM contacts WHERE user_id = ?').all(user.id);
      for (const contact of contacts) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const last = new Date(contact.last_contact_date);
        last.setHours(0, 0, 0, 0);
        const daysSince = Math.floor((today - last) / 86400000);

        if (daysSince > contact.cadence_days) {
          const recentNotif = db.prepare(`
            SELECT id FROM notifications
            WHERE user_id = ? AND contact_id = ? AND type = 'cadence'
            AND created_at > datetime('now', '-1 day')
          `).get(user.id, contact.id);

          if (!recentNotif) {
            db.prepare(`
              INSERT INTO notifications (user_id, contact_id, type, title, body)
              VALUES (?, ?, 'cadence', ?, ?)
            `).run(
              user.id, contact.id,
              `${contact.name} is overdue`,
              `Last contact was ${daysSince} days ago. Your cadence is every ${contact.cadence_days} days.`
            );
          }
        }
      }

      // Opportunity deadline notifications
      const opps = db.prepare(
        "SELECT o.*, c.name as contact_name, c.stars as contact_stars FROM opportunities o LEFT JOIN contacts c ON c.id = o.contact_id WHERE o.user_id = ? AND o.status IN ('Active','Waiting')"
      ).all(user.id);

      for (const opp of opps) {
        const daysUntil = getDaysUntil(opp.deadline);
        const stars = opp.contact_stars || 3;

        if (shouldNotifyOpportunity(stars, daysUntil)) {
          const windowHours = daysUntil <= 1 ? 12 : 24;
          const recentNotif = db.prepare(`
            SELECT id FROM notifications
            WHERE user_id = ? AND opportunity_id = ? AND type = 'deadline'
            AND created_at > datetime('now', '-${windowHours} hours')
          `).get(user.id, opp.id);

          if (!recentNotif) {
            const urgency = daysUntil <= 0 ? 'urgent' : 'deadline';
            const label = daysUntil <= 0 ? 'is today' : daysUntil === 1 ? 'is tomorrow' : `is in ${daysUntil} days`;
            const body = opp.contact_name
              ? `Follow up with ${opp.contact_name}. ${getEscalationLabel(stars, daysUntil)} alerts active.`
              : `Review your application materials and confirm next steps.`;

            db.prepare(`
              INSERT INTO notifications (user_id, contact_id, opportunity_id, type, title, body)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(user.id, opp.contact_id || null, opp.id, urgency, `${opp.title} deadline ${label}`, body);
          }
        }
      }
    }
  } catch (err) {
    console.error('Escalation engine error:', err.message);
  }
}

// ── Awaiting-Response Escalation ─────────────────────────────────────────────

function getResponseNotifInterval(stars, notifCount) {
  // Returns minimum hours since last_notified_at (or detected_at if count=0) before next notification.
  // Returns null to stop notifying entirely.
  if (stars === 5) {
    const intervals = [2, 4, 6, 12, 24];
    return notifCount < intervals.length ? intervals[notifCount] : 24;
  }
  if (stars === 4) {
    const intervals = [6, 18, 24];
    return notifCount < intervals.length ? intervals[notifCount] : 48;
  }
  if (stars === 3) {
    const intervals = [24, 48];
    return notifCount < intervals.length ? intervals[notifCount] : 72;
  }
  if (stars === 2) {
    return notifCount === 0 ? 48 : 96;
  }
  if (stars === 1) {
    return notifCount === 0 ? 72 : null;
  }
  return null;
}

function getResponseNotifBody(contactName, subject, hoursSince, notifCount) {
  const timeStr = hoursSince < 24
    ? `${Math.round(hoursSince)} hours ago`
    : `${Math.floor(hoursSince / 24)} ${Math.floor(hoursSince / 24) === 1 ? 'day' : 'days'} ago`;

  if (notifCount === 0) {
    return `${contactName} replied to '${subject}' ${timeStr}. Tap to draft a response.`;
  }
  if (notifCount <= 2) {
    return `Still no response to ${contactName}. They emailed you ${timeStr} re: '${subject}'.`;
  }
  return `${contactName} has been waiting ${timeStr}. Don't let this one slip.`;
}

function runResponseEscalation() {
  try {
    const pending = db.prepare(`
      SELECT pr.*, c.name as contact_name, c.stars as contact_stars,
             et.subject as email_subject
      FROM pending_responses pr
      JOIN contacts c ON c.id = pr.contact_id
      JOIN email_threads et ON et.id = pr.email_thread_id
      WHERE pr.status = 'pending'
    `).all();

    const now = Date.now();

    for (const pr of pending) {
      const stars = pr.stars_at_detection;
      const minInterval = getResponseNotifInterval(stars, pr.notification_count);
      if (minInterval === null) continue; // Stop notifying

      const referenceTime = pr.last_notified_at || pr.detected_at;
      const hoursSinceRef = (now - new Date(referenceTime).getTime()) / 3600000;
      if (hoursSinceRef < minInterval) continue;

      const hoursSinceDetected = (now - new Date(pr.detected_at).getTime()) / 3600000;

      // Deduplicate: skip if we already sent one in the last (minInterval - 0.5) hours
      const recentCheck = db.prepare(`
        SELECT id FROM notifications
        WHERE user_id = ? AND contact_id = ? AND type = 'awaiting_reply'
        AND created_at > datetime('now', '-${Math.max(1, Math.floor(minInterval))} hours')
      `).get(pr.user_id, pr.contact_id);

      if (recentCheck) continue;

      const body = getResponseNotifBody(
        pr.contact_name,
        pr.email_subject,
        hoursSinceDetected,
        pr.notification_count
      );

      db.prepare(`
        INSERT INTO notifications (user_id, contact_id, type, title, body)
        VALUES (?, ?, 'awaiting_reply', ?, ?)
      `).run(
        pr.user_id,
        pr.contact_id,
        `${pr.contact_name} is waiting for your reply`,
        body
      );

      db.prepare(`
        UPDATE pending_responses
        SET notification_count = notification_count + 1,
            last_notified_at = datetime('now')
        WHERE id = ?
      `).run(pr.id);
    }
  } catch (err) {
    console.error('Response escalation error:', err.message);
  }
}

function startEscalationEngine() {
  runEscalation();
  runResponseEscalation();
  setInterval(() => {
    runEscalation();
    runResponseEscalation();
  }, 60 * 60 * 1000);
  console.log('Escalation engine started');
}

module.exports = { startEscalationEngine, getEscalationLabel };
