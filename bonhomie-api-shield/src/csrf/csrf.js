import crypto from 'node:crypto';

/**
 * Generate a random CSRF token
 * @param {number} size
 * @returns {string}
 */
export function generateCsrfToken(size = 32) {
  return crypto.randomBytes(size).toString('hex');
}

/**
 * Timing-safe equality check
 * @param {string} a
 * @param {string} b
 */
function safeEqual(a, b) {
  if (!a || !b) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

/**
 * Middleware to ensure a CSRF cookie exists and expose req.csrfToken.
 *
 * Uses the double-submit cookie pattern: the cookie MUST be readable by
 * client-side JS so the browser can echo it back as a header or body field.
 * For this reason the cookie is NOT httpOnly.
 *
 * Requires cookie-parser (or equivalent) to be mounted before this middleware.
 *
 * @param {{
 *  cookieName?: string;
 *  cookieOptions?: import("express").CookieOptions;
 * }} options
 */
export function csrfCookie(options = {}) {
  const { cookieName = 'csrf_token', cookieOptions = {} } = options;

  return (req, res, next) => {
    const cookies = req.cookies || {};
    let token = cookies[cookieName];

    if (!token) {
      token = generateCsrfToken();
      if (typeof res.cookie === 'function') {
        res.cookie(cookieName, token, {
          // httpOnly must be false so client JS can read and echo the value
          httpOnly: false,
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
          ...cookieOptions,
        });
      }
    }

    req.csrfToken = token;
    next();
  };
}

/**
 * Middleware to validate CSRF token using the double-submit cookie pattern.
 *
 * Looks for the token in (in order of priority):
 *   1. x-csrf-token header
 *   2. req.body.csrfToken
 *   3. req.query.csrfToken
 *
 * @param {{
 *  cookieName?: string;
 *  headerName?: string;
 *  bodyField?: string;
 *  queryField?: string;
 * }} options
 */
export function csrfProtect(options = {}) {
  const {
    cookieName = 'csrf_token',
    headerName = 'x-csrf-token',
    bodyField = 'csrfToken',
    queryField = 'csrfToken',
  } = options;

  const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

  return (req, res, next) => {
    if (!UNSAFE_METHODS.includes(req.method.toUpperCase())) {
      return next();
    }

    const cookies = req.cookies || {};
    const cookieToken = cookies[cookieName];
    const headerToken =
      req.headers[headerName] || req.headers[headerName.toLowerCase()];
    const bodyToken = req.body?.[bodyField];
    const queryToken = req.query?.[queryField];

    const provided = headerToken || bodyToken || queryToken;

    if (
      !cookieToken ||
      !provided ||
      !safeEqual(String(cookieToken), String(provided))
    ) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Invalid CSRF token',
          statusCode: 403,
        },
      });
    }

    next();
  };
}
