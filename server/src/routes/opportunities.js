const router = require('express').Router();
const db = require('../db/database');
const authenticate = require('../middleware/auth');

function computeState(deadline, status) {
  if (status === 'Completed') return { state: 'completed', daysLeft: null };
  if (!deadline) return { state: 'active', daysLeft: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dl = new Date(deadline);
  dl.setHours(0, 0, 0, 0);
  const diff = Math.ceil((dl - today) / 86400000);
  if (diff < 0) return { state: 'overdue', daysLeft: Math.abs(diff) };
  if (diff <= 7) return { state: 'upcoming', daysLeft: diff };
  return { state: 'active', daysLeft: diff };
}

function enrichOpps(opps) {
  return opps.map(o => {
    const { state, daysLeft } = computeState(o.deadline, o.status);
    let contact = null;
    if (o.contact_id) {
      contact = db.prepare('SELECT id, name, stars, role FROM contacts WHERE id = ?').get(o.contact_id);
    }
    return { ...o, state, days_left: daysLeft, contact };
  });
}

router.get('/', authenticate, (req, res) => {
  const opps = db.prepare('SELECT * FROM opportunities WHERE user_id = ? ORDER BY deadline ASC').all(req.userId);
  res.json(enrichOpps(opps));
});

router.post('/', authenticate, (req, res) => {
  const { title, contact_id, status, deadline, notes } = req.body;
  if (!title) return res.status(400).json({ message: 'Title required' });

  const result = db.prepare(`
    INSERT INTO opportunities (user_id, contact_id, title, status, deadline, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.userId, contact_id || null, title, status || 'Active', deadline || null, notes || null);

  const opp = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(result.lastInsertRowid);
  const { state, daysLeft } = computeState(opp.deadline, opp.status);
  res.status(201).json({ ...opp, state, days_left: daysLeft });
});

router.put('/:id', authenticate, (req, res) => {
  const opp = db.prepare('SELECT id FROM opportunities WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!opp) return res.status(404).json({ message: 'Opportunity not found' });

  const { title, contact_id, status, deadline, notes } = req.body;
  const fields = [];
  const vals = [];
  if (title !== undefined) { fields.push('title = ?'); vals.push(title); }
  if (contact_id !== undefined) { fields.push('contact_id = ?'); vals.push(contact_id); }
  if (status !== undefined) { fields.push('status = ?'); vals.push(status); }
  if (deadline !== undefined) { fields.push('deadline = ?'); vals.push(deadline); }
  if (notes !== undefined) { fields.push('notes = ?'); vals.push(notes); }

  if (!fields.length) return res.status(400).json({ message: 'No fields to update' });
  vals.push(req.params.id, req.userId);

  db.prepare(`UPDATE opportunities SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...vals);
  const updated = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(req.params.id);
  const { state, daysLeft } = computeState(updated.deadline, updated.status);
  let contact = null;
  if (updated.contact_id) {
    contact = db.prepare('SELECT id, name, stars, role FROM contacts WHERE id = ?').get(updated.contact_id);
  }
  res.json({ ...updated, state, days_left: daysLeft, contact });
});

router.delete('/:id', authenticate, (req, res) => {
  const result = db.prepare('DELETE FROM opportunities WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (!result.changes) return res.status(404).json({ message: 'Opportunity not found' });
  res.json({ message: 'Deleted' });
});

module.exports = router;
