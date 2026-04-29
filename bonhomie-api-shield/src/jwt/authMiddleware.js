import { extractToken } from './extractToken.js';
import { verifyJwt } from './jwtUtils.js';
import { ApiError } from '../errors/ApiError.js';

/**
 * Express middleware to verify JWT and attach user to req.user
 *
 * @param {{ secret: string, cookieName?: string, roles?: string[] }} options
 */
export function requireAuth(options) {
  const { secret, cookieName = 'token', roles = [] } = options;

  if (!secret) {
    throw new Error('[api-shield] requireAuth: secret is required.');
  }

  return (req, res, next) => {
    const token = extractToken(req, cookieName);

    if (!token) {
      return next(new ApiError(401, 'Missing authentication token'));
    }

    let decoded;
    try {
      decoded = verifyJwt(token, { secret });
    } catch (err) {
      return next(err);
    }

    req.user = decoded;

    // If route restricts roles
    if (roles.length > 0) {
      const userRole = decoded.role;
      if (!roles.includes(userRole)) {
        return next(new ApiError(403, 'Access denied (insufficient permissions)'));
      }
    }

    next();
  };
}
