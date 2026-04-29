import { getClientIp } from '../fingerprint/getIp.js';

const BOT_UA_PATTERNS = [
  /bot/i,
  /crawl/i,
  /spider/i,
  /slurp/i,
  /headless/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /scrapy/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /httpclient/i,
  /http-client/i,
  /postman/i,
  /insomnia/i,
  /java\/\d/i,
  /okhttp/i,
];

/**
 * Returns true when the IP is a private/loopback address.
 * These are common behind load balancers and inside Docker/k8s, so we no
 * longer treat them as suspicious — we simply skip the IP heuristic.
 */
function isPrivateIp(ip) {
  if (!ip) return true;
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

/**
 * Detect bots based on UA, IP, and headers.
 *
 * @param {any} req
 * @param {{ threshold?: number }} [options]
 * @returns {{ isBot: boolean; score: number; reasons: string[]; ip: string | null; userAgent: string; }}
 */
export function detectBot(req, options = {}) {
  const { threshold = 50 } = options;

  const headers = req.headers || {};
  const userAgent = (headers['user-agent'] || '').toString();
  const acceptLang = headers['accept-language'];
  const xfwd = headers['x-forwarded-for'];
  const ip = getClientIp(req) || null;

  let score = 0;
  /** @type {string[]} */
  const reasons = [];

  // 1) User-Agent checks
  if (!userAgent || userAgent.trim() === '') {
    score += 40;
    reasons.push('Missing User-Agent header');
  } else {
    if (BOT_UA_PATTERNS.some((re) => re.test(userAgent))) {
      score += 50;
      reasons.push('User-Agent matches known bot/crawler pattern');
    }
    if (userAgent.length < 20) {
      score += 10;
      reasons.push('Very short User-Agent string');
    }
  }

  // 2) Accept-Language missing (scripts often omit it)
  if (!acceptLang) {
    score += 10;
    reasons.push('Missing Accept-Language header');
  }

  // 3) Unusually long X-Forwarded-For chain
  if (typeof xfwd === 'string') {
    const parts = xfwd.split(',').map((p) => p.trim());
    if (parts.length > 3) {
      score += 10;
      reasons.push('Long X-Forwarded-For chain (> 3 hops)');
    }
  }

  // 4) IP heuristics — skip private/loopback ranges because those are normal
  //    inside Docker, Kubernetes, or behind a reverse proxy.
  if (ip && !isPrivateIp(ip)) {
    // Future: plug in an IP reputation service here
  }

  return {
    isBot: score >= threshold,
    score,
    reasons,
    ip,
    userAgent,
  };
}

/**
 * Express middleware:
 * - Attaches detection result to req.botDetection
 * - Optionally blocks bots with 403
 *
 * @param {{ threshold?: number; block?: boolean }} [options]
 */
export function botGuard(options = {}) {
  const { threshold = 50, block = false } = options;

  return function botGuardMiddleware(req, res, next) {
    const result = detectBot(req, { threshold });
    req.botDetection = result;

    if (block && result.isBot) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied (suspected automated traffic)',
          statusCode: 403,
        },
      });
    }

    next();
  };
}
