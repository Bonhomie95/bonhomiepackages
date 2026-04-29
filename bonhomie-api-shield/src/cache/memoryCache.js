/**
 * In-memory cache with TTL.
 * Good for single server instances.
 */
export function createMemoryCache() {
  /** @type {Map<string, { value: any, expires: number }>} */
  const store = new Map();

  function now() {
    return Date.now();
  }

  function isExpired(entry) {
    return entry.expires !== 0 && entry.expires < now();
  }

  return {
    /**
     * Store a value
     */
    set(key, value, ttlMs = 0) {
      store.set(key, {
        value,
        expires: ttlMs > 0 ? now() + ttlMs : 0
      });
    },

    /**
     * Retrieve a value
     */
    get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      if (isExpired(entry)) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },

    /**
     * Delete a key
     */
    del(key) {
      store.delete(key);
    },

    /**
     * Compute → Cache → Return
     */
    async wrap(key, fn, ttlMs = 0) {
      const cached = this.get(key);
      if (cached !== null) return cached;

      const value = await fn();
      this.set(key, value, ttlMs);
      return value;
    }
  };
}
