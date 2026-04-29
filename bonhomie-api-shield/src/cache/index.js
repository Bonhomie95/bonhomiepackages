export { createMemoryCache } from './memoryCache.js';
export { createRedisCache } from './redisCache.js';

/**
 * Auto-detect cache type based on presence of redis instance.
 */
export function createCache(options = {}) {
  if (options.redis) {
    return createRedisCache(options.redis);
  }
  return createMemoryCache();
}
