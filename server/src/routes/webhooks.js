const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// RevenueCat sends raw JSON — parse it before this route
// Mount with: app.use('/api/webhooks', require('./routes/webhooks'))

const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Events that grant Pro access
const PRO_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
]);

// Events that revoke Pro access (only after period ends — RevenueCat sends at expiry)
const FREE_EVENTS = new Set([
  'EXPIRATION',
  'BILLING_ISSUE',
]);

function verifySignature(body, signatureHeader) {
  if (!REVENUECAT_WEBHOOK_SECRET) return true; // skip in dev if not set
  const expected = crypto
    .createHmac('sha256', REVENUECAT_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signatureHeader ?? '', 'hex')
  );
}

async function setSupabaseTier(userId, tier) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[webhook] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — skipping tier update');
    return;
  }
  const url = `${SUPABASE_URL}/auth/v1/admin/users/${userId}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ user_metadata: { tier } }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[webhook] Supabase update failed for ${userId}:`, text);
  } else {
    console.log(`[webhook] Set tier=${tier} for user ${userId}`);
  }
}

router.post('/revenuecat', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['x-revenuecat-signature'];
  if (!verifySignature(req.body, sig)) {
    return res.status(401).json({ error: 'invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(req.body.toString());
  } catch {
    return res.status(400).json({ error: 'invalid json' });
  }

  const event = payload?.event;
  if (!event) return res.status(400).json({ error: 'missing event' });

  const eventType = event.type;
  const userId = event.app_user_id; // RevenueCat stores Supabase UUID here when you set it as the user ID

  if (!userId) {
    console.warn('[webhook] No app_user_id in event:', eventType);
    return res.json({ received: true });
  }

  if (PRO_EVENTS.has(eventType)) {
    await setSupabaseTier(userId, 'pro');
  } else if (FREE_EVENTS.has(eventType)) {
    await setSupabaseTier(userId, 'free');
  } else {
    // CANCELLATION means cancelled but not yet expired — user keeps Pro until period ends
    console.log(`[webhook] Unhandled event type: ${eventType} for ${userId}`);
  }

  res.json({ received: true });
});

module.exports = router;
