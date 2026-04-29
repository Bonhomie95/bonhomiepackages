import jwt from 'jsonwebtoken';
import { ApiError } from '../errors/ApiError.js';

/**
 * Sign JWT token
 *
 * @param {object} payload
 * @param {{ secret: string, expiresIn?: string }} options
 * @returns {string}
 */
export function signJwt(payload, options) {
  const { secret, expiresIn = '1d' } = options;

  if (!secret) {
    throw new Error('[api-shield] signJwt: secret is required.');
  }

  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Verify JWT token
 *
 * @param {string} token
 * @param {{ secret: string }} options
 * @returns {object} decoded data
 */
export function verifyJwt(token, options) {
  const { secret } = options;

  if (!secret) {
    throw new Error('[api-shield] verifyJwt: secret is required.');
  }

  try {
    return jwt.verify(token, secret);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired token');
  }
}
