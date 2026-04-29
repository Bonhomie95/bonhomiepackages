/**
 * Each coercer receives the raw string value and returns:
 *   { ok: true, value }  — success
 *   { ok: false, error } — failure message
 */
export const coerce = {
  string(v) {
    return { ok: true, value: String(v).trim() };
  },

  number(v) {
    const n = Number(v);
    if (Number.isNaN(n)) return { ok: false, error: 'must be a valid number' };
    return { ok: true, value: n };
  },

  integer(v) {
    const n = Number(v);
    if (Number.isNaN(n) || !Number.isInteger(n))
      return { ok: false, error: 'must be a valid integer' };
    return { ok: true, value: n };
  },

  boolean(v) {
    const s = String(v).trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(s)) return { ok: true, value: true };
    if (['false', '0', 'no', 'off'].includes(s)) return { ok: true, value: false };
    return { ok: false, error: 'must be true/false/1/0/yes/no/on/off' };
  },

  port(v) {
    const n = Number(v);
    if (Number.isNaN(n) || !Number.isInteger(n) || n < 1 || n > 65535)
      return { ok: false, error: 'must be a valid port number (1–65535)' };
    return { ok: true, value: n };
  },

  url(v) {
    const s = String(v).trim();
    try {
      new URL(s);
      return { ok: true, value: s };
    } catch {
      return { ok: false, error: 'must be a valid URL (e.g. https://example.com)' };
    }
  },

  email(v) {
    const s = String(v).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s))
      return { ok: false, error: 'must be a valid email address' };
    return { ok: true, value: s };
  },

  json(v) {
    try {
      return { ok: true, value: JSON.parse(v) };
    } catch {
      return { ok: false, error: 'must be valid JSON' };
    }
  },
};
