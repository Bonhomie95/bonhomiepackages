import crypto from 'crypto';

/**
 * Generate a secure random nonce
 * @param {number} size
 * @returns {string}
 */
export function generateNonce(size = 32) {
  return crypto.randomBytes(size).toString('hex');
}

/**
 * Verify if two nonces are equal using
 * timing-safe comparison to prevent
 * timing attacks.
 *
 * @param {string} nonce
 * @param {string} expected
 * @returns {boolean}
 */
export function verifyNonce(nonce, expected) {
  if (!nonce || !expected) return false;

  try {
    return crypto.timingSafeEqual(Buffer.from(nonce), Buffer.from(expected));
  } catch {
    return false;
  }
}
