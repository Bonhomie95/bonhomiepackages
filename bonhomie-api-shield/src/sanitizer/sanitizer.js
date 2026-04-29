import xss from 'xss';

/**
 * Sanitize a single string against XSS.
 * @param {string} input
 * @param {import("xss").IFilterXSSOptions} [options]
 * @returns {string}
 */
export function sanitizeString(input, options) {
  if (!input) return '';
  return xss(input, options);
}

/**
 * Escape HTML special characters only
 * (no tag stripping, just escaping).
 *
 * @param {string} input
 * @returns {string}
 */
export function escapeHtml(input) {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Recursively sanitize all string fields in an object/array.
 *
 * @param {any} value
 * @returns {any}
 */
export function sanitizeDeep(value) {
  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((v) => sanitizeDeep(v));
  }

  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = sanitizeDeep(v);
    }
    return out;
  }

  return value;
}

/**
 * Express middleware:
 * Sanitizes req.body, req.query, req.params
 */
export function sanitizeRequest() {
  return (req, res, next) => {
    if (req.body) req.body = sanitizeDeep(req.body);
    if (req.query) req.query = sanitizeDeep(req.query);
    if (req.params) req.params = sanitizeDeep(req.params);
    next();
  };
}
