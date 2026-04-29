export { createMemoryRateLimiter } from './memoryLimiter.js';
export { createRedisRateLimiter } from './redisLimiter.js';

/**
 * @typedef {import("./memoryLimiter.js").MemoryRateLimiterOptions} MemoryRateLimiterOptions
 * @typedef {import("./redisLimiter.js").RedisRateLimiterOptions} RedisRateLimiterOptions
 */

/**
 * Auto-select rate limiter:
 * - If `redis` is passed → Redis limiter
 * - Otherwise → in-memory limiter
 *
 * @param {MemoryRateLimiterOptions | RedisRateLimiterOptions} options
 */
export function createRateLimiter(options = {}) {
  if ('redis' in options && options.redis) {
    return createRedisRateLimiter(/** @type any */ (options));
  }
  return createMemoryRateLimiter(/** @type any */ (options));
}
