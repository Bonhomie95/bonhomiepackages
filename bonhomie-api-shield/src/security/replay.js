import crypto from 'node:crypto';

/**
 * Create an anti-replay token: random nonce + timestamp.
 *
 * @param {number} ttlMs
 */
export function createReplayToken(ttlMs = 30_000) {
  return {
    token: crypto.randomBytes(16).toString('hex') + '-' + Date.now(),
    ttl: ttlMs,
  };
}

/**
 * Create an in-memory replay store with automatic expiry cleanup.
 *
 * @param {{ ttlMs?: number; cleanupIntervalMs?: number }} [options]
 */
export function createReplayStoreMemory(options = {}) {
  const { ttlMs = 30_000, cleanupIntervalMs = 60_000 } = options;

  /** @type {Map<string, number>} token → expiry timestamp */
  const used = new Map();

  // Periodically sweep expired tokens to prevent unbounded memory growth
  const sweepInterval = setInterval(() => {
    const now = Date.now();
    for (const [k, exp] of used) {
      if (exp <= now) used.delete(k);
    }
  }, cleanupIntervalMs);

  // Allow callers to clean up (useful in tests)
  if (sweepInterval.unref) sweepInterval.unref();

  return {
    /**
     * Returns true if the token is fresh and has not been seen before.
     * Returns false if the token is expired or is a replay.
     *
     * @param {string} token
     * @param {number} [customTtlMs]
     */
    verify(token, customTtlMs) {
      const now = Date.now();
      const prev = used.get(token);

      // Token already seen and not yet expired → replay detected
      if (prev !== undefined && prev > now) return false;

      // Mark token as used
      used.set(token, now + (customTtlMs ?? ttlMs));
      return true;
    },

    /** Stop the background sweep (call in test teardown). */
    destroy() {
      clearInterval(sweepInterval);
    },
  };
}

/**
 * Create a Redis-based replay store.
 *
 * @param {import("ioredis").Redis} redis
 */
export function createReplayStoreRedis(redis) {
  return {
    async verify(token, ttlMs = 30_000) {
      const key = 'api_shield_replay:' + token;

      const exists = await redis.exists(key);
      if (exists) return false;

      await redis.set(key, '1', 'PX', ttlMs);
      return true;
    },
  };
}
