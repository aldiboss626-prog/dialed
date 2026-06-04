const router = require('express').Router();
const db = require('../db/database');
const authenticate = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  const notifs = db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY is_read ASC, created_at DESC'
  ).all(req.userId);

  const enriched = notifs.map(n => {
    let contact = null;
    if (n.contact_id) {
      contact = db.prepare('SELECT id, name, stars, role FROM contacts WHERE id = ?').get(n.contact_id);
    }
    return { ...n, contact };
  });

  res.json(enriched);
});

// read-all must be registered before /:id/read to avoid Express treating "read-all" as an id
router.put('/read-all', authenticate, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.userId);
  res.json({ message: 'All marked as read' });
});

router.put('/:id/read', authenticate, (req, res) => {
  const result = db.prepare(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.userId);
  if (!result.changes) return res.status(404).json({ message: 'Notification not found' });
  res.json({ message: 'Marked as read' });
});

router.delete('/:id', authenticate, (req, res) => {
  const result = db.prepare(
    'DELETE FROM notifications WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.userId);
  if (!result.changes) return res.status(404).json({ message: 'Notification not found' });
  res.json({ message: 'Deleted' });
});

module.exports = router;
