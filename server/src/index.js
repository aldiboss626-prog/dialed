require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

require('./db/database');
const seed = require('./db/seed');
seed();

const authRoutes = require('./routes/auth');
const contactsRoutes = require('./routes/contacts');
const opportunitiesRoutes = require('./routes/opportunities');
const notificationsRoutes = require('./routes/notifications');
const gmailRoutes = require('./routes/gmail');
const googleRoutes = require('./routes/google');
const draftRoutes = require('./routes/draft');
const pendingResponsesRoutes = require('./routes/pendingResponses');
const trackerRoutes = require('./routes/tracker');
const contentRoutes = require('./routes/content');
const webhooksRoutes = require('./routes/webhooks');
const accountRoutes = require('./routes/account');
const { supabaseAuth, dailyLimit } = require('./middleware/contentGuard');
const { startEscalationEngine } = require('./services/escalation');
const { runGmailSync } = require('./services/gmailSync');

const app = express();
const PORT = process.env.PORT || 3001;

// Fail fast on missing signing secret: without this, every login/verify throws at
// request time instead. Hard error in production; loud warning in dev.
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production.');
  }
  console.warn('⚠️  JWT_SECRET is not set — auth will fail. Add it to server/.env.');
}

// CORS: the native app sends no Origin header (unaffected either way). In production,
// only allow the browser origins listed in CORS_ORIGIN (comma-separated); dev stays open.
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '12mb' })); // large enough for base64 screenshot uploads
app.use(cookieParser());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/opportunities', opportunitiesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/google', googleRoutes);
app.use('/api', draftRoutes);
app.use('/api/pending-responses', pendingResponsesRoutes);
app.use('/api/tracker', trackerRoutes);
// AI endpoints spend the Anthropic key — require a logged-in user + cap per-user daily usage.
app.use('/api/content', supabaseAuth, dailyLimit(40), contentRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/webhooks', webhooksRoutes);

startEscalationEngine();

// Periodically pull fresh Gmail metadata for connected users and detect owed replies.
// No-op for users who haven't connected Google. Interval configurable via env (minutes).
const GMAIL_SYNC_MINUTES = Number(process.env.GMAIL_SYNC_MINUTES) || 10;
setInterval(() => { runGmailSync(); }, GMAIL_SYNC_MINUTES * 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dialed server running on http://localhost:${PORT}`);
});
