const router = require('express').Router();
const db = require('../db/database');
const authenticate = require('../middleware/auth');

router.put('/:id/dismiss', authenticate, (req, res) => {
  const pr = db.prepare(
    'SELECT id FROM pending_responses WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);
  if (!pr) return res.status(404).json({ message: 'Not found' });

  db.prepare("UPDATE pending_responses SET status = 'dismissed' WHERE id = ?").run(req.params.id);

  // Turn off requires_response on the email thread
  const prRow = db.prepare('SELECT email_thread_id FROM pending_responses WHERE id = ?').get(req.params.id);
  if (prRow) {
    try {
      db.prepare('UPDATE email_threads SET requires_response = 0 WHERE id = ?').run(prRow.email_thread_id);
    } catch {}
  }

  res.json({ message: 'Dismissed' });
});

router.put('/:id/responded', authenticate, (req, res) => {
  const pr = db.prepare(
    'SELECT id FROM pending_responses WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);
  if (!pr) return res.status(404).json({ message: 'Not found' });

  db.prepare("UPDATE pending_responses SET status = 'responded' WHERE id = ?").run(req.params.id);

  const prRow = db.prepare(
    'SELECT email_thread_id, contact_id FROM pending_responses WHERE id = ?'
  ).get(req.params.id);
  if (prRow) {
    try {
      db.prepare(
        "UPDATE email_threads SET requires_response = 0, response_detected_at = datetime('now') WHERE id = ?"
      ).run(prRow.email_thread_id);
    } catch {}
  }

  res.json({ message: 'Marked as responded' });
});

module.exports = router;
