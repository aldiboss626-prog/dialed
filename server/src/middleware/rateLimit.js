// Minimal in-memory rate limiter (per-IP sliding window).
//
// Protects credential endpoints from brute-force: bcrypt.compareSync is ~100ms of
// CPU per attempt, so unthrottled /login is both a password-guessing and a CPU-burn
// vector. In-memory is fine for a single Railway instance (same trade-off as the
// dailyLimit counter in contentGuard) — swap for Redis if this ever scales out.

const buckets = new Map(); // key -> number[] of attempt timestamps (ms)

// Periodically drop stale keys so the map can't grow unbounded.
const SWEEP_MS = 10 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, times] of buckets) {
    if (times.length === 0 || now - times[times.length - 1] > SWEEP_MS) buckets.delete(key);
  }
}, SWEEP_MS).unref();

/**
 * rateLimit({ windowMs, max, keyPrefix }) — 429s a client that exceeds `max`
 * requests within `windowMs`. Keyed by IP (plus prefix so different endpoints
 * don't share budgets).
 */
function rateLimit({ windowMs = 15 * 60 * 1000, max = 20, keyPrefix = '' } = {}) {
  return (req, res, next) => {
    const key = `${keyPrefix}:${req.ip}`;
    const now = Date.now();
    const times = (buckets.get(key) || []).filter(t => now - t < windowMs);
    if (times.length >= max) {
      buckets.set(key, times);
      return res.status(429).json({
        error: 'rate_limited',
        message: 'Too many attempts. Please wait a few minutes and try again.',
      });
    }
    times.push(now);
    buckets.set(key, times);
    next();
  };
}

module.exports = rateLimit;
