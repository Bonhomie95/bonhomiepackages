import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createFetchKit, FetchError, TimeoutError } from '../src/index.js';

// ─── Fetch mock helpers ────────────────────────────────────────────────────

let capturedRequests = [];

function mockFetch(responses) {
  let callIndex = 0;
  capturedRequests = [];

  globalThis.fetch = async (url, init = {}) => {
    const entry = Array.isArray(responses)
      ? responses[Math.min(callIndex++, responses.length - 1)]
      : responses;

    capturedRequests.push({ url, ...init });

    if (entry instanceof Error) throw entry;

    const {
      status = 200,
      body = null,
      headers = {},
      delay = 0,
    } = entry;

    if (delay) await new Promise((r) => setTimeout(r, delay));

    const ct = headers['content-type'] ?? (body !== null ? 'application/json' : '');
    const allHeaders = { 'content-type': ct, ...headers };

    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: statusText(status),
      headers: {
        get: (k) => allHeaders[k.toLowerCase()] ?? null,
      },
      json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
      text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    };
  };
}

function statusText(code) {
  const map = {
    200: 'OK', 201: 'Created', 204: 'No Content',
    400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
    404: 'Not Found', 500: 'Internal Server Error', 502: 'Bad Gateway',
    503: 'Service Unavailable', 504: 'Gateway Timeout',
  };
  return map[code] ?? '';
}

function throws(fn, check) {
  return fn().then(
    () => assert.fail('Expected rejection'),
    (err) => { if (check) check(err); }
  );
}

// ─── GET ──────────────────────────────────────────────────────────────────

describe('GET requests', () => {
  test('returns parsed JSON on 200', async () => {
    mockFetch({ status: 200, body: { id: 1, name: 'Alice' } });
    const api = createFetchKit({ baseUrl: 'https://api.test' });
    const data = await api.get('/users/1');
    assert.deepEqual(data, { id: 1, name: 'Alice' });
  });

  test('appends query params to URL', async () => {
    mockFetch({ status: 200, body: [] });
    const api = createFetchKit({ baseUrl: 'https://api.test' });
    await api.get('/users', { query: { page: 1, limit: 10 } });
    assert.ok(capturedRequests[0].url.includes('page=1'));
    assert.ok(capturedRequests[0].url.includes('limit=10'));
  });

  test('omits null/undefined query params', async () => {
    mockFetch({ status: 200, body: [] });
    const api = createFetchKit({ baseUrl: 'https://api.test' });
    await api.get('/users', { query: { page: 1, filter: null, sort: undefined } });
    assert.ok(!capturedRequests[0].url.includes('filter'));
    assert.ok(!capturedRequests[0].url.includes('sort'));
  });

  test('returns null on 204 No Content', async () => {
    mockFetch({ status: 204, body: null, headers: {} });
    const api = createFetchKit({ baseUrl: 'https://api.test' });
    const data = await api.get('/noop');
    assert.equal(data, null);
  });

  test('works with no baseUrl (relative path)', async () => {
    mockFetch({ status: 200, body: { ok: true } });
    const api = createFetchKit({});
    await api.get('/health');
    assert.equal(capturedRequests[0].url, '/health');
  });

  test('trailing slash in baseUrl is normalized', async () => {
    mockFetch({ status: 200, body: {} });
    const api = createFetchKit({ baseUrl: 'https://api.test/' });
    await api.get('/users');
    assert.equal(capturedRequests[0].url, 'https://api.test/users');
  });
});

// ─── POST / PUT / PATCH / DELETE ──────────────────────────────────────────

describe('POST requests', () => {
  test('sends JSON body with correct Content-Type', async () => {
    mockFetch({ status: 201, body: { id: 99 } });
    const api = createFetchKit({ baseUrl: 'https://api.test' });
    await api.post('/users', { name: 'Bob' });
    assert.equal(capturedRequests[0].method, 'POST');
    assert.equal(capturedRequests[0].headers['Content-Type'], 'application/json');
    assert.equal(capturedRequests[0].body, JSON.stringify({ name: 'Bob' }));
  });

  test('POST with no body sends no body', async () => {
    mockFetch({ status: 200, body: {} });
    const api = createFetchKit({ baseUrl: 'https://api.test' });
    await api.post('/trigger');
    assert.equal(capturedRequests[0].body, undefined);
  });
});

describe('PUT / PATCH / DELETE', () => {
  test('PUT sends correct method + body', async () => {
    mockFetch({ status: 200, body: {} });
    const api = createFetchKit({ baseUrl: 'https://api.test' });
    await api.put('/users/1', { name: 'New' });
    assert.equal(capturedRequests[0].method, 'PUT');
    assert.equal(capturedRequests[0].body, JSON.stringify({ name: 'New' }));
  });

  test('PATCH sends correct method + body', async () => {
    mockFetch({ status: 200, body: {} });
    const api = createFetchKit({ baseUrl: 'https://api.test' });
    await api.patch('/users/1', { name: 'Updated' });
    assert.equal(capturedRequests[0].method, 'PATCH');
  });

  test('DELETE sends correct method', async () => {
    mockFetch({ status: 200, body: {} });
    const api = createFetchKit({ baseUrl: 'https://api.test' });
    await api.delete('/users/1');
    assert.equal(capturedRequests[0].method, 'DELETE');
  });
});

// ─── Auth token ───────────────────────────────────────────────────────────

describe('auth token injection', () => {
  test('getToken → Bearer header is set', async () => {
    mockFetch({ status: 200, body: {} });
    const api = createFetchKit({
      baseUrl: 'https://api.test',
      getToken: () => 'my-token',
    });
    await api.get('/me');
    assert.equal(capturedRequests[0].headers['Authorization'], 'Bearer my-token');
  });

  test('async getToken is awaited', async () => {
    mockFetch({ status: 200, body: {} });
    const api = createFetchKit({
      baseUrl: 'https://api.test',
      getToken: async () => 'async-token',
    });
    await api.get('/me');
    assert.equal(capturedRequests[0].headers['Authorization'], 'Bearer async-token');
  });

  test('null token → no Authorization header', async () => {
    mockFetch({ status: 200, body: {} });
    const api = createFetchKit({
      baseUrl: 'https://api.test',
      getToken: () => null,
    });
    await api.get('/me');
    assert.equal(capturedRequests[0].headers['Authorization'], undefined);
  });

  test('per-request header overrides default', async () => {
    mockFetch({ status: 200, body: {} });
    const api = createFetchKit({
      baseUrl: 'https://api.test',
      headers: { 'X-App': 'bonhomie' },
    });
    await api.get('/me', { headers: { 'X-Custom': 'yes' } });
    assert.equal(capturedRequests[0].headers['X-App'], 'bonhomie');
    assert.equal(capturedRequests[0].headers['X-Custom'], 'yes');
  });
});

// ─── 401 token refresh ────────────────────────────────────────────────────

describe('401 token refresh', () => {
  test('calls onTokenExpired and retries once', async () => {
    mockFetch([
      { status: 401, body: { error: 'Unauthorized' } },
      { status: 200, body: { id: 1 } },
    ]);

    let refreshCalled = false;
    const api = createFetchKit({
      baseUrl: 'https://api.test',
      getToken: () => 'old-token',
      onTokenExpired: async () => {
        refreshCalled = true;
        return 'new-token';
      },
    });

    const data = await api.get('/me');
    assert.ok(refreshCalled);
    assert.equal(data.id, 1);
    // Second request used new token
    assert.equal(capturedRequests[1].headers['Authorization'], 'Bearer new-token');
  });

  test('no second retry after refresh still 401', async () => {
    mockFetch([
      { status: 401, body: {} },
      { status: 401, body: {} },
    ]);
    const api = createFetchKit({
      baseUrl: 'https://api.test',
      onTokenExpired: async () => 'new-token',
    });
    await throws(() => api.get('/me'), (err) => {
      assert.ok(err instanceof FetchError);
      assert.equal(err.status, 401);
      // Exactly 2 requests — one original + one retry
      assert.equal(capturedRequests.length, 2);
    });
  });

  test('no onTokenExpired → throws FetchError(401) immediately', async () => {
    mockFetch({ status: 401, body: {} });
    const api = createFetchKit({ baseUrl: 'https://api.test' });
    await throws(() => api.get('/me'), (err) => {
      assert.equal(err.status, 401);
      assert.ok(err.isUnauthorized());
    });
  });
});

// ─── Error responses ──────────────────────────────────────────────────────

describe('error responses', () => {
  test('404 throws FetchError with status', async () => {
    mockFetch({ status: 404, body: { error: 'Not found' } });
    const api = createFetchKit({ baseUrl: 'https://api.test' });
    await throws(() => api.get('/missing'), (err) => {
      assert.ok(err instanceof FetchError);
      assert.equal(err.status, 404);
      assert.ok(err.isNotFound());
      assert.ok(err.isClientError());
    });
  });

  test('403 throws FetchError', async () => {
    mockFetch({ status: 403, body: {} });
    const api = createFetchKit({ baseUrl: 'https://api.test' });
    await throws(() => api.get('/admin'), (err) => {
      assert.equal(err.status, 403);
      assert.ok(err.isForbidden());
    });
  });

  test('500 throws FetchError with body', async () => {
    mockFetch({ status: 500, body: { error: 'crash' } });
    const api = createFetchKit({ baseUrl: 'https://api.test' });
    await throws(() => api.get('/crash'), (err) => {
      assert.equal(err.status, 500);
      assert.ok(err.isServerError());
      assert.deepEqual(err.body, { error: 'crash' });
    });
  });

  test('error includes url and method', async () => {
    mockFetch({ status: 400, body: {} });
    const api = createFetchKit({ baseUrl: 'https://api.test' });
    await throws(() => api.post('/users', {}), (err) => {
      assert.ok(err.url.includes('/users'));
      assert.equal(err.method, 'POST');
    });
  });

  test('onError callback is called on failure', async () => {
    mockFetch({ status: 500, body: {} });
    let caught = null;
    const api = createFetchKit({
      baseUrl: 'https://api.test',
      onError: (err) => { caught = err; },
    });
    await api.get('/crash').catch(() => {});
    assert.ok(caught instanceof FetchError);
  });
});

// ─── Retry ────────────────────────────────────────────────────────────────

describe('retry logic', () => {
  test('retries on 500 up to retries count then throws', async () => {
    mockFetch([
      { status: 500, body: {} },
      { status: 500, body: {} },
      { status: 500, body: {} },
    ]);
    const api = createFetchKit({
      baseUrl: 'https://api.test',
      retries: 2,
      retryDelay: 0,
    });
    await throws(() => api.get('/unstable'), (err) => {
      assert.equal(err.status, 500);
      assert.equal(capturedRequests.length, 3); // 1 original + 2 retries
    });
  });

  test('succeeds after retry', async () => {
    mockFetch([
      { status: 503, body: {} },
      { status: 200, body: { ok: true } },
    ]);
    const api = createFetchKit({
      baseUrl: 'https://api.test',
      retries: 1,
      retryDelay: 0,
    });
    const data = await api.get('/flaky');
    assert.equal(data.ok, true);
    assert.equal(capturedRequests.length, 2);
  });

  test('no retry on 4xx (except 401 with onTokenExpired)', async () => {
    mockFetch({ status: 400, body: {} });
    const api = createFetchKit({
      baseUrl: 'https://api.test',
      retries: 2,
      retryDelay: 0,
    });
    await throws(() => api.get('/bad'), () => {
      assert.equal(capturedRequests.length, 1); // no retries
    });
  });

  test('retries on network error', async () => {
    mockFetch([
      new Error('Network failure'),
      new Error('Network failure'),
      { status: 200, body: { ok: true } },
    ]);
    const api = createFetchKit({
      baseUrl: 'https://api.test',
      retries: 2,
      retryDelay: 0,
    });
    const data = await api.get('/net');
    assert.equal(data.ok, true);
  });
});

// ─── Timeout ──────────────────────────────────────────────────────────────

describe('timeout', () => {
  test('throws TimeoutError when response exceeds timeout', async () => {
    mockFetch({ status: 200, body: {}, delay: 200 });
    const api = createFetchKit({
      baseUrl: 'https://api.test',
      timeout: 50,
    });
    await throws(() => api.get('/slow'), (err) => {
      assert.ok(err instanceof TimeoutError);
      assert.match(err.message, /timed out/i);
    });
  });

  test('no timeout set — slow response succeeds', async () => {
    mockFetch({ status: 200, body: { ok: true }, delay: 50 });
    const api = createFetchKit({ baseUrl: 'https://api.test' });
    const data = await api.get('/slow');
    assert.equal(data.ok, true);
  });
});

// ─── Interceptors ────────────────────────────────────────────────────────

describe('interceptors', () => {
  test('onRequest can add headers', async () => {
    mockFetch({ status: 200, body: {} });
    const api = createFetchKit({
      baseUrl: 'https://api.test',
      onRequest: (config) => ({
        ...config,
        headers: { ...config.headers, 'X-Request-ID': 'abc123' },
      }),
    });
    await api.get('/me');
    assert.equal(capturedRequests[0].headers['X-Request-ID'], 'abc123');
  });

  test('onResponse can transform data', async () => {
    mockFetch({ status: 200, body: { nested: { value: 42 } } });
    const api = createFetchKit({
      baseUrl: 'https://api.test',
      onResponse: ({ data }) => data.nested,
    });
    const result = await api.get('/data');
    assert.deepEqual(result, { value: 42 });
  });
});

// ─── Abort signal ────────────────────────────────────────────────────────

describe('abort signal', () => {
  test('aborted request throws FetchError (not crash)', async () => {
    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';
    mockFetch(abortErr);

    const api = createFetchKit({ baseUrl: 'https://api.test' });
    const controller = new AbortController();

    await throws(
      () => api.get('/abortable', { signal: controller.signal }),
      (err) => {
        assert.ok(err instanceof FetchError);
        assert.match(err.message, /aborted/i);
      }
    );
  });
});

// ─── Security ────────────────────────────────────────────────────────────

describe('security', () => {
  test('header injection — newline in header value is stripped', async () => {
    mockFetch({ status: 200, body: {} });
    const api = createFetchKit({
      baseUrl: 'https://api.test',
      headers: { 'X-Custom': 'value\r\nX-Injected: evil' },
    });
    await api.get('/me');
    const h = capturedRequests[0].headers['X-Custom'];
    // The CRLF sequence is what enables injection — confirm it's stripped.
    // Remaining text is just a string in the header value (harmless).
    assert.ok(!h.includes('\r'), 'CR not stripped');
    assert.ok(!h.includes('\n'), 'LF not stripped');
  });

  test('header injection in per-request header is stripped', async () => {
    mockFetch({ status: 200, body: {} });
    const api = createFetchKit({ baseUrl: 'https://api.test' });
    await api.get('/me', { headers: { 'X-Bad': 'val\nX-Injected: attack' } });
    const h = capturedRequests[0].headers['X-Bad'];
    assert.ok(!h.includes('\n'));
  });

  test('null-byte in header value is stripped', async () => {
    mockFetch({ status: 200, body: {} });
    const api = createFetchKit({
      baseUrl: 'https://api.test',
      headers: { 'X-Null': 'value\0secret' },
    });
    await api.get('/me');
    const h = capturedRequests[0].headers['X-Null'];
    assert.ok(!h.includes('\0'));
  });

  test('token is NOT included in FetchError message', async () => {
    mockFetch({ status: 500, body: {} });
    const api = createFetchKit({
      baseUrl: 'https://api.test',
      getToken: () => 'super-secret-jwt-token',
    });
    await throws(() => api.get('/crash'), (err) => {
      assert.ok(
        !err.message.includes('super-secret-jwt-token'),
        'Token leaked in error message'
      );
    });
  });

  test('malformed JSON response does not crash — returns null', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: (k) => k === 'content-type' ? 'application/json' : null,
      },
      json: async () => { throw new SyntaxError('Unexpected token'); },
      text: async () => '{bad',
    });

    const api = createFetchKit({ baseUrl: 'https://api.test' });
    const data = await api.get('/bad-json');
    assert.equal(data, null);
  });

  test('non-serializable body throws FetchError — not unhandled crash', async () => {
    mockFetch({ status: 200, body: {} });
    const api = createFetchKit({ baseUrl: 'https://api.test' });
    const circular = {};
    circular.self = circular;

    await throws(
      () => api.post('/data', circular),
      (err) => {
        assert.ok(err instanceof FetchError);
        assert.match(err.message, /serialize/i);
      }
    );
  });
});

// ─── FetchError helpers ───────────────────────────────────────────────────

describe('FetchError class helpers', () => {
  test('isClientError true for 4xx', () => {
    const e = new FetchError('test', { status: 422 });
    assert.ok(e.isClientError());
    assert.ok(!e.isServerError());
  });

  test('isServerError true for 5xx', () => {
    const e = new FetchError('test', { status: 503 });
    assert.ok(e.isServerError());
    assert.ok(!e.isClientError());
  });

  test('isNetworkError true when status is null', () => {
    const e = new FetchError('network');
    assert.ok(e.isNetworkError());
  });

  test('isUnauthorized, isForbidden, isNotFound helpers', () => {
    assert.ok(new FetchError('', { status: 401 }).isUnauthorized());
    assert.ok(new FetchError('', { status: 403 }).isForbidden());
    assert.ok(new FetchError('', { status: 404 }).isNotFound());
  });
});
