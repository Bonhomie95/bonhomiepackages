/**
 * Compute SHA-256 hash of a file in the browser.
 *
 * SHA-256 is used instead of SHA-1 — SHA-1 is cryptographically broken and
 * should not be used even for non-security purposes like deduplication.
 *
 * @param {File} file
 * @returns {Promise<{ success: boolean; hash?: string; error?: string }>}
 */
export default async function hashBrowser(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return { success: true, hash: hashHex };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
