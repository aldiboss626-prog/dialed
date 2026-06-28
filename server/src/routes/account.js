// Account / data deletion — required for the Gmail CASA security assessment
// ("delete user data on request") and good practice regardless.
//
// Every table's user_id is `references auth.users(id) on delete cascade`, so deleting
// the auth user removes ALL of their rows (contacts, opportunities, email_threads,
// pending_responses, notifications, interactions, sent_replies, groups, tags) automatically.
const router = require('express').Router();
const fetch = require('node-fetch');
const { supabaseAuth } = require('../middleware/contentGuard');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pxkmpuubzeqppkxludla.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // server-only secret — set in env / Railway

// DELETE /api/account — permanently delete the signed-in user and everything they own.
router.delete('/', supabaseAuth, async (req, res) => {
  if (!SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: 'not_configured',
      message: 'Account deletion is not configured on the server (missing SUPABASE_SERVICE_ROLE_KEY).',
    });
  }
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${req.userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY },
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      return res.status(502).json({ error: 'delete_failed', message: body.slice(0, 200) || 'Supabase admin delete failed.' });
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'delete_failed', message: 'Could not delete account.' });
  }
});

module.exports = router;
