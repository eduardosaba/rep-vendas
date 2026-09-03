import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// MASTER KEY (32 bytes obrigatórios)
// During build time, allow missing key (will throw at runtime when actually used)
let ENCRYPTION_KEY = process.env.MASTER_ENCRYPTION_KEY;
let key: Buffer | null = null;

function getKey(): Buffer {
  if (!key) {
    if (!ENCRYPTION_KEY) {
      // During build/preview, return a dummy key to avoid build failure
      // Real encryption/decryption will fail at runtime with clear error
      if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'test') {
        return Buffer.alloc(32, 0); // Dummy key for build
      }
      throw new Error('MASTER_ENCRYPTION_KEY não configurada no ambiente');
    }
    key = Buffer.from(ENCRYPTION_KEY, 'hex');
    if (key.length !== 32) {
      throw new Error('MASTER_ENCRYPTION_KEY deve ter 32 bytes (64 chars hex)');
    }
  }
  return key;
}

/**
 * Encrypt (API keys, tokens, secrets)
 */
export function encrypt(text: string): string {
  const keyBuffer = getKey();
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // payload = iv + authTag + encrypted
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypt (runtime usage only server-side)
 */
export function deserializeAndDecrypt(payload: string): string {
  const keyBuffer = getKey();
  const data = Buffer.from(payload, 'base64');

  const iv = data.subarray(0, 16);
  const authTag = data.subarray(16, 32);
  const encrypted = data.subarray(32);

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}