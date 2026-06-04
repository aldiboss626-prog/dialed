const router = require('express').Router();
const db = require('../db/database');
const authenticate = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  const userId = req.userId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Contacts with status ───────────────────────────────────────────────────
  const contacts = db.prepare('SELECT * FROM contacts WHERE user_id = ?').all(userId);

  let overdueCt = 0, dueSoonCt = 0;
  const contactsWithStatus = contacts.map(c => {
    const last = new Date(c.last_contact_date);
    last.setHours(0, 0, 0, 0);
    const daysSince = Math.floor((today - last) / 86400000);
    let status;
    if (daysSince > c.cadence_days) { status = 'overdue'; overdueCt++; }
    else if (daysSince > c.cadence_days - 3) { status = 'due-soon'; dueSoonCt++; }
    else status = 'good';
    return { ...c, days_since_contact: daysSince, status };
  });

  const awaitingCt = db.prepare(
    "SELECT COUNT(*) as c FROM pending_responses WHERE user_id = ? AND status = 'pending'"
  ).get(userId).c;

  const recentInteractions = db.prepare(
    "SELECT COUNT(*) as c FROM interactions WHERE user_id = ? AND date >= date('now', '-7 days')"
  ).get(userId).c;

  const rawScore = 100 - overdueCt * 8 - dueSoonCt * 4 - awaitingCt * 5 + recentInteractions * 2;
  const orbitScore = Math.max(0, Math.min(100, rawScore));

  // ── Streak ─────────────────────────────────────────────────────────────────
  const userRow = db.prepare('SELECT streak_count, last_activity_date FROM users WHERE id = ?').get(userId);

  // ── Top relationships (last 30 days) ───────────────────────────────────────
  const topRelationships = contactsWithStatus.map(c => {
    const interactions30 = db.prepare(
      "SELECT COUNT(*) as n FROM interactions WHERE contact_id = ? AND user_id = ? AND date >= date('now', '-30 days')"
    ).get(c.id, userId).n;
    const emails30 = db.prepare(
      "SELECT COUNT(*) as n FROM email_threads WHERE contact_id = ? AND user_id = ? AND date >= datetime('now', '-30 days')"
    ).get(c.id, userId).n;
    const score = interactions30 * 2 + emails30 + c.stars;
    return { id: c.id, name: c.name, role: c.role, stars: c.stars, gmail_connected: c.gmail_connected, interactions30, emails30, score };
  }).sort((a, b) => b.score - a.score).slice(0, 3);

  // ── Activity heatmap (30 days) ─────────────────────────────────────────────
  const heatmapRows = db.prepare(
    "SELECT date(date) as day, COUNT(*) as count FROM interactions WHERE user_id = ? AND date >= date('now', '-29 days') GROUP BY date(date)"
  ).all(userId);

  const heatmap = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const found = heatmapRows.find(h => h.day === dateStr);
    heatmap.push({ date: dateStr, count: found ? found.count : 0 });
  }
  const activeDays = heatmap.filter(h => h.count > 0).length;
  const totalTouchpoints = heatmap.reduce((sum, h) => sum + h.count, 0);

  // ── Most neglected (top 2 by overdue ratio) ────────────────────────────────
  const mostNeglected = contactsWithStatus
    .map(c => ({
      ...c,
      ratio: c.days_since_contact / c.cadence_days,
      overdue_days: Math.max(0, c.days_since_contact - c.cadence_days),
    }))
    .filter(c => c.ratio > 1)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 2)
    .map(c => ({ id: c.id, name: c.name, role: c.role, stars: c.stars, days_since_contact: c.days_since_contact, cadence_days: c.cadence_days, overdue_days: c.overdue_days }));

  // ── Response rate ──────────────────────────────────────────────────────────
  const totalPR = db.prepare('SELECT COUNT(*) as c FROM pending_responses WHERE user_id = ?').get(userId).c;
  const respondedPR = db.prepare("SELECT COUNT(*) as c FROM pending_responses WHERE user_id = ? AND status = 'responded'").get(userId).c;
  const responsePercent = totalPR > 0 ? Math.round(respondedPR / totalPR * 100) : null;

  res.json({
    orbitScore,
    scoreBreakdown: { overdue: overdueCt, dueSoon: dueSoonCt, awaiting: awaitingCt, recentInteractions },
    streakCount: userRow?.streak_count ?? 0,
    lastActivityDate: userRow?.last_activity_date ?? null,
    topRelationships,
    activityHeatmap: heatmap,
    activeDays,
    totalTouchpoints,
    mostNeglected,
    responseRate: { responded: respondedPR, total: totalPR, percent: responsePercent },
  });
});

module.exports = router;
