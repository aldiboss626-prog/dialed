const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// DATA_DIR lets production point the DB at a persistent volume (e.g. Railway's /data mount).
const DB_PATH = path.join(process.env.DATA_DIR || path.join(__dirname, '../../data'), 'dialed.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

// Column migrations — safe to re-run on every start
function addCol(table, col, def) {
  try { db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`).run(); } catch {}
}
addCol('email_threads', 'requires_response', 'INTEGER DEFAULT 0');
addCol('email_threads', 'response_detected_at', 'DATETIME');
addCol('users', 'streak_count', 'INTEGER DEFAULT 0');
addCol('users', 'last_activity_date', 'DATE');
addCol('users', 'google_access_token', 'TEXT');
addCol('users', 'google_refresh_token', 'TEXT');
addCol('users', 'google_token_expiry', 'INTEGER');
// Gmail message id, so a re-sync of the same message doesn't create duplicate threads.
addCol('email_threads', 'gmail_message_id', 'TEXT');
try { db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_email_threads_gmail_msg ON email_threads(user_id, gmail_message_id)').run(); } catch {}

module.exports = db;
