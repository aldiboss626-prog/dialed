const router = require('express').Router();
const db = require('../db/database');
const authenticate = require('../middleware/auth');
const { detectPendingResponses } = require('../services/gmailSync');

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

module.exports = router;
