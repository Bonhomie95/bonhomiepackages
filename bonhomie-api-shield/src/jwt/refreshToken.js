import { signJwt, verifyJwt } from './jwtUtils.js';
/**
 * Refresh flow:
 * - Verify refresh token
 * - Reissue access token
 *
 * @param {string} refreshToken
 * @param {{ refreshSecret: string, accessSecret: string, accessExpiresIn?: string }} options
 */
export function refreshAccessToken(refreshToken, options) {
  const { refreshSecret, accessSecret, accessExpiresIn = '15m' } = options;

  if (!refreshSecret || !accessSecret) {
    throw new Error('[api-shield] refreshAccessToken: missing secrets.');
  }

  const decoded = verifyJwt(refreshToken, { secret: refreshSecret });

  const newAccessToken = signJwt(
    { id: decoded.id, role: decoded.role },
    { secret: accessSecret, expiresIn: accessExpiresIn }
  );

  return { accessToken: newAccessToken, user: decoded };
}
