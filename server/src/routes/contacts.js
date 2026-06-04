const router = require('express').Router();
const db = require('../db/database');
const authenticate = require('../middleware/auth');

function computeStatus(lastContactDate, cadenceDays) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = new Date(lastContactDate);
  last.setHours(0, 0, 0, 0);
  const days = Math.floor((today - last) / 86400000);
  if (days > cadenceDays) return { status: 'overdue', days };
  if (days > cadenceDays - 3) return { status: 'due-soon', days };
  return { status: 'good', days };
}

function enrichContacts(contacts, userId) {
  const opps = db.prepare(
    "SELECT * FROM opportunities WHERE user_id = ? AND status IN ('Active','Waiting') AND contact_id IS NOT NULL"
  ).all(userId);

  return contacts
    .map(c => {
      const { status, days } = computeStatus(c.last_contact_date, c.cadence_days);
      const linked = opps
        .filter(o => o.contact_id === c.id)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0] || null;
      return { ...c, status, days_since_contact: days, linked_opportunity: linked };
    })
    .sort((a, b) => {
      const order = { overdue: 0, 'due-soon': 1, good: 2 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return b.stars - a.stars;
    });
}

router.get('/', authenticate, (req, res) => {
  const contacts = db.prepare('SELECT * FROM contacts WHERE user_id = ?').all(req.userId);
  res.json(enrichContacts(contacts, req.userId));
});

router.get('/pending-responses', authenticate, (req, res) => {
  const rows = db.prepare(`
    SELECT pr.*,
           c.name  AS contact_name, c.stars AS contact_stars, c.role AS contact_role,
           et.subject AS email_subject, et.date AS email_date, et.preview AS email_preview
    FROM pending_responses pr
    JOIN contacts c  ON c.id  = pr.contact_id
    JOIN email_threads et ON et.id = pr.email_thread_id
    WHERE pr.user_id = ? AND pr.status = 'pending'
    ORDER BY c.stars DESC, pr.detected_at ASC
  `).all(req.userId);

  res.json(rows.map(r => ({
    id: r.id,
    contact_id: r.contact_id,
    email_thread_id: r.email_thread_id,
    detected_at: r.detected_at,
    stars_at_detection: r.stars_at_detection,
    last_notified_at: r.last_notified_at,
    notification_count: r.notification_count,
    status: r.status,
    created_at: r.created_at,
    contact: { id: r.contact_id, name: r.contact_name, stars: r.contact_stars, role: r.contact_role },
    email_subject: r.email_subject,
    email_date: r.email_date,
    email_preview: r.email_preview,
  })));
});

router.get('/suggestions', authenticate, (req, res) => {
  res.json([
    { id: 's1', name: 'David Park', email: 'david.park@blackrock.com', hint: 'emailed 6 times this month', role: 'Associate at BlackRock' },
    { id: 's2', name: 'Michelle Torres', email: 'm.torres@deloitte.com', hint: 'emailed 3 times', role: 'Analyst at Deloitte' },
  ]);
});

router.get('/:id', authenticate, (req, res) => {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!contact) return res.status(404).json({ message: 'Contact not found' });

  const { status, days } = computeStatus(contact.last_contact_date, contact.cadence_days);
  const emails = db.prepare(
    'SELECT * FROM email_threads WHERE contact_id = ? AND user_id = ? ORDER BY date DESC'
  ).all(req.params.id, req.userId);
  const interactions = db.prepare(
    'SELECT * FROM interactions WHERE contact_id = ? AND user_id = ? ORDER BY date DESC'
  ).all(req.params.id, req.userId);
  const opportunities = db.prepare(
    "SELECT * FROM opportunities WHERE contact_id = ? AND user_id = ? AND status IN ('Active','Waiting') ORDER BY deadline ASC"
  ).all(req.params.id, req.userId);

  const pendingResponse = db.prepare(`
    SELECT pr.*, et.subject AS email_subject, et.date AS email_date, et.preview AS email_preview
    FROM pending_responses pr
    JOIN email_threads et ON et.id = pr.email_thread_id
    WHERE pr.contact_id = ? AND pr.user_id = ? AND pr.status = 'pending'
    ORDER BY pr.detected_at ASC LIMIT 1
  `).get(req.params.id, req.userId) || null;

  res.json({ ...contact, status, days_since_contact: days, email_threads: emails, interactions, opportunities, pending_response: pendingResponse });
});

router.post('/', authenticate, (req, res) => {
  const { name, email, role, relationship_type, stars, notes } = req.body;
  if (!name) return res.status(400).json({ message: 'Name required' });

  const cadenceMap = { 5: 5, 4: 10, 3: 14, 2: 21, 1: 30 };
  const s = parseInt(stars) || 3;
  const cadence = cadenceMap[s] || 14;
  const today = new Date().toISOString().split('T')[0];

  const result = db.prepare(`
    INSERT INTO contacts (user_id, name, email, role, relationship_type, stars, cadence_days, last_contact_date, notes, gmail_connected)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(req.userId, name, email || null, role || null, relationship_type || null, s, cadence, today, notes || null);

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid);
  const { status, days } = computeStatus(contact.last_contact_date, contact.cadence_days);
  res.status(201).json({ ...contact, status, days_since_contact: days });
});

router.put('/:id', authenticate, (req, res) => {
  const contact = db.prepare('SELECT id FROM contacts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!contact) return res.status(404).json({ message: 'Contact not found' });

  const { name, email, role, relationship_type, stars, cadence_days, notes } = req.body;
  const cadenceMap = { 5: 5, 4: 10, 3: 14, 2: 21, 1: 30 };
  const s = parseInt(stars);
  const cadence = cadence_days !== undefined ? parseInt(cadence_days) : (cadenceMap[s] || undefined);

  const fields = [];
  const vals = [];
  if (name !== undefined) { fields.push('name = ?'); vals.push(name); }
  if (email !== undefined) { fields.push('email = ?'); vals.push(email); }
  if (role !== undefined) { fields.push('role = ?'); vals.push(role); }
  if (relationship_type !== undefined) { fields.push('relationship_type = ?'); vals.push(relationship_type); }
  if (stars !== undefined) { fields.push('stars = ?'); vals.push(s); }
  if (cadence !== undefined) { fields.push('cadence_days = ?'); vals.push(cadence); }
  if (notes !== undefined) { fields.push('notes = ?'); vals.push(notes); }

  if (!fields.length) return res.status(400).json({ message: 'No fields to update' });
  vals.push(req.params.id, req.userId);

  db.prepare(`UPDATE contacts SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...vals);
  const updated = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  const { status, days } = computeStatus(updated.last_contact_date, updated.cadence_days);
  res.json({ ...updated, status, days_since_contact: days });
});

router.put('/:id/talked', authenticate, (req, res) => {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!contact) return res.status(404).json({ message: 'Contact not found' });

  const today = new Date().toISOString().split('T')[0];
  db.prepare('UPDATE contacts SET last_contact_date = ? WHERE id = ?').run(today, req.params.id);
  db.prepare("INSERT INTO interactions (contact_id, user_id, date, note, type) VALUES (?, ?, ?, 'Marked as talked', 'message')").run(
    req.params.id, req.userId, today
  );

  // Auto-resolve any pending responses for this contact
  db.prepare(
    "UPDATE pending_responses SET status = 'responded' WHERE contact_id = ? AND user_id = ? AND status = 'pending'"
  ).run(req.params.id, req.userId);

  const updated = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  const { status, days } = computeStatus(updated.last_contact_date, updated.cadence_days);
  res.json({ ...updated, status, days_since_contact: days });
});

router.delete('/:id', authenticate, (req, res) => {
  const result = db.prepare('DELETE FROM contacts WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (!result.changes) return res.status(404).json({ message: 'Contact not found' });
  res.json({ message: 'Deleted' });
});

module.exports = router;
