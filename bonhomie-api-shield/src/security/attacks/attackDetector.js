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

/**
 * Recursively extract all string values from a value (object/array/primitive).
 * FIX (v2.1.1): The original implementation only read Object.values() one level
 * deep. An attacker could hide injection payloads in nested fields:
 *
 *   req.body = { user: { name: "'; DROP TABLE users; --" } }
 *
 * and the outer body scan would extract only the object { name: "..." } —
 * a non-string — leaving the nested string completely unchecked.
 *
 * This fix walks the entire object graph so nested payloads are caught.
 */
function collectStrings(value, out = []) {
  if (typeof value === 'string') {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectStrings(v, out);
  }
  return out;
}

function extractStrings(req) {
  const list = [];
  collectStrings(req.query  || {}, list);
  collectStrings(req.params || {}, list);
  collectStrings(req.body   || {}, list);
  return list;
}

/**
 * Detect multiple types of injection / traversal attacks.
 *
 * v2.1:   reasons are deduplicated (Set) so the same attack type is not
 *         reported multiple times just because it appeared in several fields.
 * v2.1.1: nested body objects are now fully scanned (see collectStrings above).
 *
 * @param {any} req
 * @returns {{ ip: string|null; userAgent: string; score: number; isAttack: boolean; reasons: string[] }}
 */
export function detectAttack(req) {
  const ip = getClientIp(req);
  const ua = req.headers['user-agent'] || '';

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
