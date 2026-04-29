import { getClientIp } from '../fingerprint/getIp.js';
import { getRequestFingerprintV2 } from '../fingerprint/getDevice.js';

export function requestLogger(options = {}) {
  const {
    logFn = console.log,
    includeBody = false, // optional
    includeHeaders = false, // optional
  } = options;

  return (req, res, next) => {
    const start = Date.now();
    const ip = getClientIp(req);
    const fingerprint = getRequestFingerprintV2(req).fingerprint;
    const ua = req.headers['user-agent'] || '';

    const originalEnd = res.end;

    res.end = function (chunk, encoding, cb) {
      const duration = Date.now() - start;
      const status = res.statusCode;

      const log = {
        method: req.method,
        path: req.originalUrl,
        status,
        duration,
        ip,
        ua,
        fingerprint,
        timestamp: new Date().toISOString(),
      };

      if (includeBody) {
        log.body = req.body;
      }
      if (includeHeaders) {
        log.headers = req.headers;
      }

      logFn(log); // send to console or external service

      originalEnd.call(res, chunk, encoding, cb);
    };

    next();
  };
}
