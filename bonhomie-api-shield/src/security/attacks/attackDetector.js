import {
  SQLI_PATTERNS,
  XSS_PATTERNS,
  PATH_TRAVERSAL_PATTERNS,
  ENCODING_ATTACKS,
} from './patterns.js';
import { getClientIp } from '../../fingerprint/getIp.js';

function matchAny(str, patterns) {
  if (!str) return false;
  return patterns.some((re) => re.test(str));
}

function extractStrings(req) {
  const list = [];

  for (const v of Object.values(req.query || {})) {
    if (typeof v === 'string') list.push(v);
  }
  for (const v of Object.values(req.params || {})) {
    if (typeof v === 'string') list.push(v);
  }
  if (req.body && typeof req.body === 'object') {
    for (const v of Object.values(req.body)) {
      if (typeof v === 'string') list.push(v);
    }
  }

  return list;
}

/**
 * Detect multiple types of injection / traversal attacks.
 *
 * Reasons are collected as a Set to avoid duplicates when multiple
 * fields contain the same attack pattern.
 *
 * @param {any} req
 * @returns {{ ip: string|null; userAgent: string; score: number; isAttack: boolean; reasons: string[] }}
 */
export function detectAttack(req) {
  const ip = getClientIp(req);
  const ua = req.headers['user-agent'] || '';

  // Use a Set so the same reason isn't reported multiple times just
  // because multiple fields matched the same pattern.
  const reasonSet = new Set();
  let score = 0;

  const strings = extractStrings(req);

  for (const s of strings) {
    if (matchAny(s, SQLI_PATTERNS)) {
      if (!reasonSet.has('Possible SQL injection')) score += 40;
      reasonSet.add('Possible SQL injection');
    }
    if (matchAny(s, XSS_PATTERNS)) {
      if (!reasonSet.has('Possible XSS attack')) score += 40;
      reasonSet.add('Possible XSS attack');
    }
    if (matchAny(s, PATH_TRAVERSAL_PATTERNS)) {
      if (!reasonSet.has('Possible path traversal')) score += 30;
      reasonSet.add('Possible path traversal');
    }
    if (matchAny(s, ENCODING_ATTACKS)) {
      if (!reasonSet.has('Suspicious encoding detected')) score += 10;
      reasonSet.add('Suspicious encoding detected');
    }
  }

  if (!ua || ua.length < 10) {
    score += 10;
    reasonSet.add('Suspicious User-Agent');
  }

  return {
    ip,
    userAgent: ua,
    score,
    isAttack: score >= 40,
    reasons: Array.from(reasonSet),
  };
}

/**
 * Express middleware
 *
 * @param {{ block?: boolean }} options
 */
export function attackGuard(options = {}) {
  const { block = false } = options;

  return (req, res, next) => {
    const result = detectAttack(req);
    req.attackDetection = result;

    if (block && result.isAttack) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Request blocked (suspicious input detected)',
          statusCode: 403,
          reasons: result.reasons,
        },
      });
    }

    next();
  };
}
