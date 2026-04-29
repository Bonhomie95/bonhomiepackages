/**
 * Redis-based cache wrapper.
 * Uses JSON automatically.
 *
 * @param {import("ioredis").Redis} redis
 */
export function createRedisCache(redis) {
  if (!redis) {
    throw new Error('[api-shield] createRedisCache: Redis instance required.');
  }

  return {
    async set(key, value, ttlMs = 0) {
      const serialized = JSON.stringify(value);
      if (ttlMs > 0) {
        await redis.set(key, serialized, 'PX', ttlMs);
      } else {
        await redis.set(key, serialized);
      }
    },

    async get(key) {
      const data = await redis.get(key);
      if (!data) return null;

      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    },

    async del(key) {
      await redis.del(key);
    },

    async wrap(key, fn, ttlMs = 0) {
      const cached = await this.get(key);
      if (cached !== null) return cached;

      const value = await fn();
      await this.set(key, value, ttlMs);
      return value;
    },
  };
}
