// src/services/encryption.service.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

const secretKey = process.env.ENCRYPTION_SECRET;

if (!secretKey || secretKey.length !== 32) {
  throw new Error('ENCRYPTION_SECRET is not defined or is not 32 characters long in .env file.');
}

const key = Buffer.from(secretKey, 'utf-8');

/**
 * Encrypts a plaintext string.
 * @param text The string to encrypt.
 * @returns A base64 encoded string containing the iv, authTag, and encrypted data.
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Concatenate iv, authTag, and encrypted data, then encode as base64
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypts an encrypted, base64 encoded string.
 * @param encryptedText The base64 encoded string to decrypt.
 * @returns The original plaintext string.
 */
export function decrypt(encryptedText: string | null | undefined): string {
  if (!encryptedText) {
    return '';
  }
  try {
    const data = Buffer.from(encryptedText, 'base64');
    const iv = data.slice(0, IV_LENGTH);
    const authTag = data.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = data.slice(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
}
