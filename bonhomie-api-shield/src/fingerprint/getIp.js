/**
 * Get client IP address, supporting proxies.
 *
 * @param {any} req
 * @param {{ trustProxy?: boolean }} [options]
 * @returns {string | null}
 */
export function getClientIp(req, options = {}) {
  const { trustProxy = true } = options;

  if (trustProxy) {
    const xfwd = req.headers?.['x-forwarded-for'];
    if (typeof xfwd === 'string' && xfwd.length > 0) {
      const parts = xfwd.split(',').map((p) => p.trim());
      if (parts[0]) return parts[0];
    }
  }

  const ip =
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.connection?.socket?.remoteAddress;

  if (!ip) return null;

  // Normalize IPv6 localhost etc.
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
}
