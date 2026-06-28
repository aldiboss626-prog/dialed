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
const draftRoutes = require('./routes/draft');
const pendingResponsesRoutes = require('./routes/pendingResponses');
const trackerRoutes = require('./routes/tracker');
const contentRoutes = require('./routes/content');
const webhooksRoutes = require('./routes/webhooks');
const accountRoutes = require('./routes/account');
const { supabaseAuth, dailyLimit } = require('./middleware/contentGuard');
const { startEscalationEngine } = require('./services/escalation');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: (origin, cb) => cb(null, true), // allow all origins (dev only — tighten for production)
  credentials: true,
}));
app.use(express.json({ limit: '12mb' })); // large enough for base64 screenshot uploads
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/opportunities', opportunitiesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api', draftRoutes);
app.use('/api/pending-responses', pendingResponsesRoutes);
app.use('/api/tracker', trackerRoutes);
// AI endpoints spend the Anthropic key — require a logged-in user + cap per-user daily usage.
app.use('/api/content', supabaseAuth, dailyLimit(40), contentRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/webhooks', webhooksRoutes);

startEscalationEngine();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dialed server running on http://localhost:${PORT}`);
});
