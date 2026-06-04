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
const { startEscalationEngine } = require('./services/escalation');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/opportunities', opportunitiesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api', draftRoutes);
app.use('/api/pending-responses', pendingResponsesRoutes);
app.use('/api/tracker', trackerRoutes);

startEscalationEngine();

app.listen(PORT, () => {
  console.log(`Dialed server running on http://localhost:${PORT}`);
});
