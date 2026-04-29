/**
 * @typedef {Object} MemoryRateLimiterOptions
 * @property {number} [windowMs]  Time window in ms
 * @property {number} [max]       Max requests in window
 * @property {(req: any) => string} [keyGenerator]  Key per client
 * @property {(req: any, res: any) => void} [onLimitReached]
 * @property {number} [cleanupIntervalMs]  How often to sweep stale keys (default: 5 min)
 */

/**
 * In-memory rate limiter (per-process).
 * Good for small apps or single-instance setups.
 *
 * @param {MemoryRateLimiterOptions} options
 * @returns {(req: any, res: any, next: any) => void}
 */
export function createMemoryRateLimiter(options = {}) {
  const {
    windowMs = 60_000,
    max = 60,
    keyGenerator = (req) => req.ip || 'global',
    onLimitReached,
    cleanupIntervalMs = 5 * 60_000,
  } = options;

  /** @type {Map<string, number[]>} */
  const hits = new Map();

  // Sweep keys whose entire timestamp arrays have expired to prevent
  // unbounded memory growth from bots or unique-IP scanners
  const sweep = setInterval(() => {
    const windowStart = Date.now() - windowMs;
    for (const [key, timestamps] of hits) {
      const recent = timestamps.filter((ts) => ts > windowStart);
      if (recent.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, recent);
      }
    }
  }, cleanupIntervalMs);

  if (sweep.unref) sweep.unref();

  return function memoryRateLimiter(req, res, next) {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    const timestamps = hits.get(key) || [];
    const recent = timestamps.filter((ts) => ts > windowStart);
    recent.push(now);

    if (recent.length === 0) {
      hits.delete(key);
    } else {
      hits.set(key, recent);
    }

    if (recent.length > max) {
      if (onLimitReached) onLimitReached(req, res);

      if (!res.headersSent) {
        res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later.',
        });
      }
      return;
    }

    next();
  };
}
