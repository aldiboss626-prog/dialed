// Protects the AI content endpoints (which spend the Anthropic key) two ways:
//   1) supabaseAuth — only logged-in app users can call them (verifies the Supabase JWT).
//   2) dailyLimit   — caps how many AI actions one user can trigger per day.
// Together these mean a leaked server URL can't be looped to drain your credit.

const fetch = require('node-fetch');

// Public values (the anon key is meant to be public). Override via env in production.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pxkmpuubzeqppkxludla.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_NsyLVVxgRlMakIUKu25Akg_ycb5xOsJ';

// Verify a Supabase access token by asking Supabase who it belongs to.
// Sets req.userId on success; 401 otherwise.
async function supabaseAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'auth_required', message: 'Sign in to use AI features.' });

  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    });
    if (!resp.ok) return res.status(401).json({ error: 'invalid_token', message: 'Your session expired — sign in again.' });
    const user = await resp.json();
    if (!user?.id) return res.status(401).json({ error: 'invalid_token', message: 'Your session expired — sign in again.' });
    req.userId = user.id;
    next();
  } catch {
    res.status(401).json({ error: 'auth_check_failed', message: 'Could not verify your session.' });
  }
}

// In-memory per-user daily counter. Fine for a single Railway instance; swap for a
// Supabase/Redis counter if you ever scale to multiple instances.
const counters = new Map(); // userId -> { day: 'YYYY-MM-DD', count: number }

function dailyLimit(max = 40) {
  return (req, res, next) => {
    const userId = req.userId;
    if (!userId) return next(); // supabaseAuth runs first; defensive
    const today = new Date().toISOString().slice(0, 10);
    const entry = counters.get(userId);
    if (!entry || entry.day !== today) {
      counters.set(userId, { day: today, count: 1 });
      return next();
    }
    if (entry.count >= max) {
      return res.status(429).json({
        error: 'daily_limit_reached',
        message: `You've hit today's AI limit (${max}). It resets tomorrow.`,
      });
    }
    entry.count += 1;
    next();
  };
}

module.exports = { supabaseAuth, dailyLimit };
