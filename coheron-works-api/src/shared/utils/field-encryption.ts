import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const keyHex = process.env.FIELD_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('FIELD_ENCRYPTION_KEY environment variable is not set');
  }
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new Error(`FIELD_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters)`);
  }
  return key;
}

// Warn on startup if key is missing in production
if (process.env.NODE_ENV === 'production' && !process.env.FIELD_ENCRYPTION_KEY) {
  console.warn('[field-encryption] WARNING: FIELD_ENCRYPTION_KEY is not set in production. Encrypted field operations will fail.');
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns a string in the format `iv:authTag:ciphertext` (all base64-encoded).
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypts a string produced by `encrypt`.
 * Expects the format `iv:authTag:ciphertext` (all base64-encoded).
 */
export function decrypt(encrypted: string): string {
  const key = getEncryptionKey();
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format. Expected iv:authTag:ciphertext');
  }

  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const ciphertext = Buffer.from(parts[2], 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return decipher.update(ciphertext) + decipher.final('utf8');
}

/**
 * Produces a deterministic SHA-256 hash of the value, suitable for
 * searching/indexing encrypted fields without exposing plaintext.
 */
export function hashForLookup(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}
