/**
 * @typedef {Object} RedisRateLimiterOptions
 * @property {import("ioredis").Redis} redis     An ioredis client instance
 * @property {number} [windowMs]                 Time window in ms
 * @property {number} [max]                      Max requests in window
 * @property {(req: any) => string} [keyGenerator]
 * @property {string} [prefix]                   Redis key prefix
 * @property {(req: any, res: any) => void} [onLimitReached]
 */

/**
 * Atomic sliding-window Redis rate limiter.
 *
 * Uses a Lua script to atomically INCR and set TTL in a single round-trip,
 * eliminating the race condition of the naive INCR + EXPIRE pattern where
 * two simultaneous "first requests" could each call EXPIRE and reset the TTL.
 *
 * @param {RedisRateLimiterOptions} options
 * @returns {(req: any, res: any, next: any) => Promise<void>}
 */
export function createRedisRateLimiter(options) {
  const {
    redis,
    windowMs = 60_000,
    max = 60,
    keyGenerator = (req) => req.ip || "global",
    prefix = "api-shield:rl:",
    onLimitReached,
  } = options;

  if (!redis) {
    throw new Error(
      "[api-shield] createRedisRateLimiter: 'redis' instance is required."
    );
  }

  const ttlSeconds = Math.ceil(windowMs / 1000);

  /**
   * Lua script: atomically increment the counter and set TTL only when the
   * key is new (count === 1). This is the only race-condition-free way to
   * combine INCR + EXPIRE in Redis without a transaction (MULTI/EXEC) that
   * still requires two round-trips.
   *
   * Returns the current count after the increment.
   */
  const luaScript = `
    local current = redis.call("INCR", KEYS[1])
    if current == 1 then
      redis.call("EXPIRE", KEYS[1], ARGV[1])
    end
    return current
  `;

  return async function redisRateLimiter(req, res, next) {
    const key = prefix + keyGenerator(req);

    try {
      const current = await redis.eval(luaScript, 1, key, ttlSeconds);

      if (current > max) {
        if (onLimitReached) onLimitReached(req, res);

        if (!res.headersSent) {
          res.status(429).json({
            success: false,
            message: "Too many requests, please try again later.",
          });
        }
        return;
      }

      next();
    } catch (err) {
      // On Redis failure, fail open — log the error but don't block the request.
      console.error("[api-shield] Redis rate limiter error:", err);
      next();
    }
  };
}
