// Encryption for OAuth tokens at rest.
//
// Google access/refresh tokens are effectively the keys to a user's inbox metadata
// and contacts. Storing them as plaintext in SQLite means anyone who reads the DB
// file (a leaked backup, a compromised host, a stray copy) can use them directly.
// We encrypt them with AES-256-GCM so the DB alone is useless without the key.
//
// The key lives ONLY in the environment (TOKEN_ENCRYPTION_KEY), never in the repo
// or the DB. Generate one with:  openssl rand -hex 32   (32 bytes = 64 hex chars).
//
// Stored format (single string):  v1:<iv b64>:<authTag b64>:<ciphertext b64>
// GCM's auth tag means tampering with the stored value is detected on decrypt.

const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const PREFIX = 'v1';

let cachedKey = null;

function getKey() {
  if (cachedKey) return cachedKey;
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY is not set. Generate one with `openssl rand -hex 32` ' +
      'and add it to server/.env before connecting any Google account.'
    );
  }
  const key = Buffer.from(hex.trim(), 'hex');
  if (key.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex characters).');
  }
  cachedKey = key;
  return key;
}

// Encrypt a plaintext string. Returns the versioned, self-describing payload string.
function encrypt(plaintext) {
  if (plaintext == null) return null;
  const iv = crypto.randomBytes(12); // 96-bit nonce, the GCM standard
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':');
}

// Decrypt a payload produced by encrypt(). Returns the original plaintext string.
// Throws if the key is wrong or the value was tampered with.
function decrypt(payload) {
  if (payload == null) return null;
  const parts = String(payload).split(':');
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error('Unrecognized encrypted token format.');
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

// True if the env is configured well enough to encrypt/decrypt. Lets routes give a
// clear "not configured" error instead of a 500 when the key is missing.
function isConfigured() {
  try { getKey(); return true; } catch { return false; }
}

module.exports = { encrypt, decrypt, isConfigured };
