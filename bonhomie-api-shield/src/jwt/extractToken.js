/**
 * Extract JWT token from:
 * - Authorization: Bearer
 * - Cookie: token
 * - x-access-token header
 *
 * @param {any} req
 * @param {string} cookieName
 */
export function extractToken(req, cookieName = "token") {
  const auth = req.headers["authorization"];
  if (auth && auth.startsWith("Bearer ")) {
    return auth.substring(7);
  }

  // Cookies
  if (req.cookies && req.cookies[cookieName]) {
    return req.cookies[cookieName];
  }

  if (req.headers["x-access-token"]) {
    return req.headers["x-access-token"];
  }

  return null;
}
