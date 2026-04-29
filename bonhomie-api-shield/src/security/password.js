import argon2 from 'argon2';
import crypto from 'crypto';

/**
 * Hash a password using argon2id
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  return argon2.hash(password, { type: argon2.argon2id });
}

/**
 * Verify a password against a stored hash
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, hash) {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Generic timing-safe compare for secrets
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function timingSafeEquals(a, b) {
  if (!a || !b) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
