import crypto from 'crypto';

/**
 * Create HMAC SHA256
 *
 * @param {string} secret
 * @param {string|Buffer} data
 */
export function createHmac(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC securely
 */
export function verifyHmac(secret, data, expected) {
  const hash = createHmac(secret, data);

  // timingSafeEqual throws if buffers have different byte lengths.
  // Hex strings must be exactly 64 chars (32 bytes) for SHA-256.
  // Reject silently if the provided expected value is the wrong length.
  if (!expected || expected.length !== hash.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}
