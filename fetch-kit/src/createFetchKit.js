import { FetchError, TimeoutError } from './errors.js';

// ─── Security helpers ──────────────────────────────────────────────────────

/**
 * Strip CR/LF from header values to prevent HTTP header injection.
 * An attacker who controls a header value could inject additional headers
 * or split the HTTP response if newlines are not stripped.
 */
function sanitizeHeaderValue(v) {
  return String(v).replace(/[\r\n\0]/g, '');
}

function sanitizeHeaders(headers = {}) {
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    if (v !== undefined && v !== null) {
      out[k] = sanitizeHeaderValue(v);
    }
  }
  return out;
}

// ─── URL helpers ───────────────────────────────────────────────────────────

function buildUrl(baseUrl, path, query) {
  const base = (baseUrl ?? '').replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  let full = `${base}${p}`;

  if (query && typeof query === 'object') {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) params.append(k, String(v));
    }
    const qs = params.toString();
    if (qs) full += `?${qs}`;
  }

  return full;
}

// ─── Response parsing ──────────────────────────────────────────────────────

async function parseBody(res) {
  // 204 No Content or explicit zero-length — return null
  if (res.status === 204) return null;
  const length = res.headers.get('content-length');
  if (length === '0') return null;

  const ct = res.headers.get('content-type') ?? '';

  if (ct.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      // Malformed JSON in response — return null rather than crash
      return null;
    }
  }

  // Anything else (text/html, text/plain, etc.)
  return res.text().catch(() => null);
}

// ─── Timeout ───────────────────────────────────────────────────────────────

function withTimeout(promise, ms, url) {
  if (!ms || ms <= 0) return promise;

  let timer;
  const abort = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(url, ms)), ms);
  });

  return Promise.race([promise, abort]).finally(() => clearTimeout(timer));
}

// ─── Retry delay ──────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Factory ───────────────────────────────────────────────────────────────

/**
 * @typedef {Object} FetchKitConfig
 * @property {string}  [baseUrl='']
 * @property {Record<string,string>} [headers]        Default headers for every request.
 * @property {() => string | null | Promise<string | null>} [getToken]  Returns the current auth token.
 * @property {() => string | Promise<string>} [onTokenExpired]  Called on 401; should refresh and return new token.
 * @property {number}  [retries=0]           How many times to retry on retryOn statuses or network errors.
 * @property {number}  [retryDelay=300]      Base delay in ms (doubles each attempt — exponential backoff).
 * @property {number[]} [retryOn]            HTTP statuses that trigger a retry. Default: [500,502,503,504].
 * @property {number}  [timeout]             Request timeout in ms.
 * @property {(config: RequestInit & { url: string }) => RequestInit} [onRequest]  Interceptor run before each request.
 * @property {(response: { status: number, data: any, headers: Headers }) => any} [onResponse]  Interceptor run after each successful parse.
 * @property {(err: FetchError) => void} [onError]    Called for every error before it's thrown.
 */

/**
 * Create a configured fetch client.
 *
 * @param {FetchKitConfig} config
 */
export function createFetchKit(config = {}) {
  const {
    baseUrl = '',
    headers: defaultHeaders = {},
    getToken,
    onTokenExpired,
    retries = 0,
    retryDelay = 300,
    retryOn = [500, 502, 503, 504],
    timeout,
    onRequest,
    onResponse,
    onError,
  } = config;

  /**
   * Core request function.
   * _isRetry and _retryCount are internal — not part of the public API.
   */
  async function request(
    method,
    path,
    {
      body,
      query,
      headers: extraHeaders = {},
      signal,
      _isRetry = false,
      _retryCount = 0,
    } = {}
  ) {
    const url = buildUrl(baseUrl, path, query);
    const upperMethod = method.toUpperCase();

    // Build headers: defaults → sanitized extra headers
    const headers = {
      ...sanitizeHeaders(defaultHeaders),
      ...sanitizeHeaders(extraHeaders),
    };

    // Inject auth token — skip when this is a post-refresh retry because the
    // refreshed token was already injected into extraHeaders by the caller.
    if (getToken && !_isRetry) {
      const token = await getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${sanitizeHeaderValue(token)}`;
      }
    }

    // Auto Content-Type for JSON bodies
    if (body !== undefined && !headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }

    // Serialize body
    let serializedBody;
    if (body !== undefined) {
      try {
        serializedBody = JSON.stringify(body);
      } catch (err) {
        throw new FetchError(`Failed to serialize request body: ${err.message}`, {
          url,
          method: upperMethod,
        });
      }
    }

    let requestConfig = {
      url,
      method: upperMethod,
      headers,
      signal,
      ...(serializedBody !== undefined ? { body: serializedBody } : {}),
    };

    // onRequest interceptor
    if (onRequest) {
      const intercepted = await onRequest({ ...requestConfig });
      if (intercepted) requestConfig = { ...requestConfig, ...intercepted };
    }

    // ── Execute fetch ──────────────────────────────────────────────────────
    let res;
    try {
      const { url: _url, ...fetchOptions } = requestConfig;
      const fetchPromise = fetch(url, fetchOptions);
      res = await withTimeout(fetchPromise, timeout, url);
    } catch (err) {
      // TimeoutError is already a FetchError subclass
      if (err instanceof TimeoutError) {
        if (onError) onError(err);
        throw err;
      }

      // Don't retry on aborted requests
      if (err.name === 'AbortError') {
        const abortErr = new FetchError('Request was aborted', { url, method: upperMethod });
        if (onError) onError(abortErr);
        throw abortErr;
      }

      // Network error — retry with exponential backoff
      if (_retryCount < retries) {
        await sleep(retryDelay * Math.pow(2, _retryCount));
        return request(method, path, {
          body,
          query,
          headers: extraHeaders,
          signal,
          _isRetry,
          _retryCount: _retryCount + 1,
        });
      }

      const networkErr = new FetchError(err.message || 'Network error', {
        url,
        method: upperMethod,
      });
      if (onError) onError(networkErr);
      throw networkErr;
    }

    // ── 401 → token refresh (once) ─────────────────────────────────────────
    if (res.status === 401 && onTokenExpired && !_isRetry) {
      let newToken;
      try {
        newToken = await onTokenExpired();
      } catch {
        const err = new FetchError('Token refresh failed', {
          status: 401,
          url,
          method: upperMethod,
        });
        if (onError) onError(err);
        throw err;
      }

      return request(method, path, {
        body,
        query,
        headers: {
          ...extraHeaders,
          ...(newToken ? { Authorization: `Bearer ${sanitizeHeaderValue(newToken)}` } : {}),
        },
        signal,
        _isRetry: true,
        _retryCount: 0,
      });
    }

    // ── Retry on server errors ─────────────────────────────────────────────
    if (retryOn.includes(res.status) && _retryCount < retries) {
      await sleep(retryDelay * Math.pow(2, _retryCount));
      return request(method, path, {
        body,
        query,
        headers: extraHeaders,
        signal,
        _isRetry,
        _retryCount: _retryCount + 1,
      });
    }

    // ── Parse body ─────────────────────────────────────────────────────────
    const data = await parseBody(res);

    // onResponse interceptor
    let finalData = data;
    if (onResponse) {
      const intercepted = await onResponse({
        status: res.status,
        data,
        headers: res.headers,
      });
      if (intercepted !== undefined) finalData = intercepted;
    }

    // ── Throw on non-OK ────────────────────────────────────────────────────
    if (!res.ok) {
      const err = new FetchError(
        `${upperMethod} ${url} → ${res.status} ${res.statusText ?? ''}`.trim(),
        {
          status: res.status,
          statusText: res.statusText,
          body: finalData,
          url,
          method: upperMethod,
        }
      );
      if (onError) onError(err);
      throw err;
    }

    return finalData;
  }

  return {
    /** GET  /path?query */
    get: (path, options = {}) => request('GET', path, options),

    /** POST /path  { body } */
    post: (path, body, options = {}) => request('POST', path, { ...options, body }),

    /** PUT  /path  { body } */
    put: (path, body, options = {}) => request('PUT', path, { ...options, body }),

    /** PATCH /path { body } */
    patch: (path, body, options = {}) => request('PATCH', path, { ...options, body }),

    /** DELETE /path */
    delete: (path, options = {}) => request('DELETE', path, options),

    /** Escape hatch for custom methods or advanced use */
    request,
  };
}
