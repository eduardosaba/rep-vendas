import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const encryptionKey = process.env.MASTER_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('MASTER_ENCRYPTION_KEY não configurada no ambiente');
  }
  const keyBuffer = Buffer.from(encryptionKey, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('MASTER_ENCRYPTION_KEY deve conter 32 bytes em hexadecimal');
  }
  return keyBuffer;
}

/**
 * Encrypt (API keys, tokens, secrets)
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

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
  const key = getEncryptionKey();
  const data = Buffer.from(payload, 'base64');

  const iv = data.subarray(0, 16);
  const authTag = data.subarray(16, 32);
  const encrypted = data.subarray(32);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
