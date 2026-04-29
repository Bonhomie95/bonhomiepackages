/**
 * A universal try-catch wrapper for async/sync functions.
 * @param {Function} fn
 * @returns {Promise<{ data?: any, error?: Error }>}
 */
export async function safe(fn) {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
