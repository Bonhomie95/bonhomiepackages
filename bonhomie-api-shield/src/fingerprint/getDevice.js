import { UAParser } from 'ua-parser-js';
import crypto from 'crypto';
import { getClientIp } from './getIp.js';

/**
 * Parse cookies from header if req.cookies is not available.
 * @param {any} req
 * @returns {Record<string, string>}
 */
function getCookies(req) {
  if (req.cookies && typeof req.cookies === 'object') {
    return req.cookies;
  }

  const header = req.headers?.cookie;
  if (!header) return {};
  const out = {};
  const parts = header.split(';');

  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split('=');
    const key = decodeURIComponent(rawKey);
    const value = decodeURIComponent(rest.join('=') || '');
    out[key] = value;
  }

  return out;
}

/**
 * Parse device info from user-agent.
 *
 * @param {any} req
 */
export function getDeviceInfo(req) {
  const uaString = req.headers?.['user-agent'] || '';
  const parser = new UAParser(uaString);
  const result = parser.getResult();

  const browser = `${result.browser.name || 'Unknown'} ${
    result.browser.version || ''
  }`.trim();
  const os = `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim();

  let deviceType = 'desktop';
  if (result.device.type === 'mobile') deviceType = 'mobile';
  if (result.device.type === 'tablet') deviceType = 'tablet';

  return {
    userAgent: uaString,
    browser,
    os,
    deviceType,
  };
}

/**
 * Simple v1 fingerprint based on IP + UA + language (legacy).
 *
 * @param {any} req
 * @returns {string}
 */
export function getRequestFingerprint(req) {
  const ip = getClientIp(req) || 'unknown-ip';
  const ua = req.headers?.['user-agent'] || 'unknown-ua';
  const lang = req.headers?.['accept-language'] || 'unknown-lang';

  const raw = `${ip}|${ua}|${lang}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Build components used in v2 fingerprint.
 *
 * @param {any} req
 */
function getFingerprintComponents(req) {
  const ip = getClientIp(req) || 'unknown-ip';
  const ua = req.headers?.['user-agent'] || 'unknown-ua';
  const lang = req.headers?.['accept-language'] || 'unknown-lang';

  const uaHash = crypto.createHash('sha256').update(ua).digest('hex');

  return {
    ip,
    ua,
    uaHash,
    lang,
  };
}

/**
 * Device fingerprint v2:
 * - Uses cookie if present (e.g. "api_shield_fp")
 * - Otherwise generates from IP + UA hash + language
 *
 * @param {any} req
 * @param {{ cookieName?: string }} [options]
 * @returns {{ fingerprint: string; fromCookie: boolean; components: { ip: string; uaHash: string; ua: string; lang: string } }}
 */
export function getRequestFingerprintV2(req, options = {}) {
  const { cookieName = 'api_shield_fp' } = options;
  const cookies = getCookies(req);
  const existing = cookies[cookieName];

  const components = getFingerprintComponents(req);

  if (existing && typeof existing === 'string' && existing.length > 0) {
    return {
      fingerprint: existing,
      fromCookie: true,
      components,
    };
  }

  const raw = `${components.ip}|${components.uaHash}|${components.lang}`;
  const fingerprint = crypto.createHash('sha256').update(raw).digest('hex');

  return {
    fingerprint,
    fromCookie: false,
    components,
  };
}

/**
 * Compute a stability score between two fingerprint component sets.
 *
 * 0  = totally different device
 * 100 = exactly same IP + UA + language
 *
 * @param {{ ip: string; uaHash: string; lang: string }} prev
 * @param {{ ip: string; uaHash: string; lang: string }} current
 * @returns {number} 0-100
 */
export function computeFingerprintStability(prev, current) {
  let score = 0;

  if (!prev || !current) return 0;

  if (prev.ip === current.ip) {
    score += 40;
  }

  if (prev.uaHash === current.uaHash) {
    score += 40;
  }

  if (prev.lang === current.lang) {
    score += 20;
  }

  return score;
}

/**
 * Get only the fingerprint cookie value (if any).
 *
 * @param {any} req
 * @param {string} [cookieName]
 * @returns {string | null}
 */
export function getFingerprintCookie(req, cookieName = 'api_shield_fp') {
  const cookies = getCookies(req);
  return cookies[cookieName] || null;
}
