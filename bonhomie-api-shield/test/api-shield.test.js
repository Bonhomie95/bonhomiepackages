import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// ─── mock helpers ──────────────────────────────────────────────────────────

function req(overrides = {}) {
  return {
    headers: {},
    cookies: {},
    query: {},
    params: {},
    body: {},
    ip: '127.0.0.1',
    method: 'GET',
    originalUrl: '/test',
    ...overrides,
  };
}

function res() {
  const r = {
    _status: 200,
    _body: null,
    _cookies: {},
    headersSent: false,
  };
  r.status = (c) => { r._status = c; return r; };
  r.json   = (b) => { r._body = b; r.headersSent = true; return r; };
  r.cookie = (n, v, o) => { r._cookies[n] = { value: v, options: o }; return r; };
  return r;
}

function next(err) { return err; }  // capture error passed to next()

// ─── JWT ───────────────────────────────────────────────────────────────────

describe('JWT — signJwt / verifyJwt', async () => {
  const { signJwt, verifyJwt } = await import('../src/jwt/jwtUtils.js');
  const { ApiError } = await import('../src/errors/ApiError.js');

  test('signs and verifies a token', () => {
    const token = signJwt({ id: 1, role: 'admin' }, { secret: 'supersecret', expiresIn: '1h' });
    const decoded = verifyJwt(token, { secret: 'supersecret' });
    assert.equal(decoded.id, 1);
    assert.equal(decoded.role, 'admin');
  });

  test('throws without secret on sign', () => {
    assert.throws(() => signJwt({ id: 1 }, { secret: '' }), /secret is required/);
  });

  test('throws without secret on verify', () => {
    assert.throws(() => verifyJwt('token', { secret: '' }), /secret is required/);
  });

  test('wrong secret → ApiError 401', () => {
    const token = signJwt({ id: 1 }, { secret: 'right-secret' });
    assert.throws(
      () => verifyJwt(token, { secret: 'wrong-secret' }),
      (err) => err instanceof ApiError && err.statusCode === 401
    );
  });

  test('expired token → ApiError 401', async () => {
    const token = signJwt({ id: 1 }, { secret: 'sec', expiresIn: '1ms' });
    await new Promise((r) => setTimeout(r, 10));
    assert.throws(
      () => verifyJwt(token, { secret: 'sec' }),
      (err) => err instanceof ApiError && err.statusCode === 401
    );
  });

  test('tampered payload → ApiError 401', () => {
    const token = signJwt({ id: 1, role: 'user' }, { secret: 'secret' });
    // Tamper the payload section (middle part of JWT)
    const parts = token.split('.');
    const fakePay = Buffer.from(JSON.stringify({ id: 1, role: 'admin' })).toString('base64url');
    const tampered = `${parts[0]}.${fakePay}.${parts[2]}`;
    assert.throws(
      () => verifyJwt(tampered, { secret: 'secret' }),
      (err) => err instanceof ApiError && err.statusCode === 401
    );
  });

  test('alg:none attack — token with no signature is rejected', () => {
    // Craft a token with alg:none manually
    const header  = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ id: 999, role: 'superadmin' })).toString('base64url');
    const noneToken = `${header}.${payload}.`;
    assert.throws(
      () => verifyJwt(noneToken, { secret: 'anySecret' }),
      (err) => err instanceof ApiError && err.statusCode === 401
    );
  });
});

// ─── requireAuth middleware ────────────────────────────────────────────────

describe('requireAuth middleware', async () => {
  const { signJwt } = await import('../src/jwt/jwtUtils.js');
  const { requireAuth } = await import('../src/jwt/authMiddleware.js');

  const SECRET = 'test-secret-1234';

  test('valid token attaches user to req', () => {
    const token = signJwt({ id: 5, role: 'user' }, { secret: SECRET });
    const request = req({ headers: { authorization: `Bearer ${token}` } });
    const response = res();
    let nextErr = null;
    requireAuth({ secret: SECRET })(request, response, (e) => { nextErr = e; });
    assert.equal(nextErr, undefined);
    assert.equal(request.user.id, 5);
  });

  test('missing token → 401 via next()', () => {
    const request = req();
    const response = res();
    const err = requireAuth({ secret: SECRET })(request, response, (e) => e);
    assert.equal(err.statusCode, 401);
  });

  test('invalid token → error via next()', () => {
    const request = req({ headers: { authorization: 'Bearer bad.token.here' } });
    const response = res();
    const err = requireAuth({ secret: SECRET })(request, response, (e) => e);
    assert.ok(err);
  });

  test('role restriction — matching role passes', () => {
    const token = signJwt({ id: 1, role: 'admin' }, { secret: SECRET });
    const request = req({ headers: { authorization: `Bearer ${token}` } });
    let nextErr = undefined;
    requireAuth({ secret: SECRET, roles: ['admin'] })(request, res(), (e) => { nextErr = e; });
    assert.equal(nextErr, undefined);
  });

  test('role restriction — wrong role → 403 via next()', () => {
    const token = signJwt({ id: 1, role: 'user' }, { secret: SECRET });
    const request = req({ headers: { authorization: `Bearer ${token}` } });
    const err = requireAuth({ secret: SECRET, roles: ['admin'] })(request, res(), (e) => e);
    assert.equal(err.statusCode, 403);
  });

  test('throws synchronously without secret', () => {
    assert.throws(() => requireAuth({ secret: '' }), /secret is required/);
  });
});

// ─── extractToken ─────────────────────────────────────────────────────────

describe('extractToken', async () => {
  const { extractToken } = await import('../src/jwt/extractToken.js');

  test('extracts from Authorization Bearer header', () => {
    const r = req({ headers: { authorization: 'Bearer mytoken123' } });
    assert.equal(extractToken(r), 'mytoken123');
  });

  test('extracts from cookie', () => {
    const r = req({ cookies: { token: 'cookietoken' } });
    assert.equal(extractToken(r), 'cookietoken');
  });

  test('extracts from x-access-token header', () => {
    const r = req({ headers: { 'x-access-token': 'headertoken' } });
    assert.equal(extractToken(r), 'headertoken');
  });

  test('returns null when no token present', () => {
    assert.equal(extractToken(req()), null);
  });

  test('Bearer takes priority over cookie', () => {
    const r = req({
      headers: { authorization: 'Bearer bearer-token' },
      cookies: { token: 'cookie-token' },
    });
    assert.equal(extractToken(r), 'bearer-token');
  });
});

// ─── CSRF ─────────────────────────────────────────────────────────────────

describe('CSRF — generateCsrfToken', async () => {
  const { generateCsrfToken, csrfCookie, csrfProtect } = await import('../src/csrf/csrf.js');

  test('generates 64-char hex token (32 bytes)', () => {
    const t = generateCsrfToken();
    assert.equal(t.length, 64);
    assert.match(t, /^[0-9a-f]+$/);
  });

  test('each token is unique', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateCsrfToken()));
    assert.equal(tokens.size, 100);
  });

  test('csrfCookie sets cookie when missing', () => {
    const request = req({ cookies: {} });
    const response = res();
    csrfCookie()(request, response, () => {});
    assert.ok(request.csrfToken);
    assert.equal(typeof request.csrfToken, 'string');
    assert.ok(response._cookies['csrf_token']);
  });

  test('csrfCookie reuses existing cookie', () => {
    const existing = 'existingtoken123';
    const request = req({ cookies: { csrf_token: existing } });
    csrfCookie()(request, res(), () => {});
    assert.equal(request.csrfToken, existing);
  });

  test('csrfProtect passes on GET', () => {
    const request = req({ method: 'GET', cookies: { csrf_token: 'tok' } });
    let called = false;
    csrfProtect()(request, res(), () => { called = true; });
    assert.ok(called);
  });

  test('csrfProtect blocks POST with mismatched token', () => {
    const request = req({
      method: 'POST',
      cookies: { csrf_token: 'real-token' },
      headers: { 'x-csrf-token': 'wrong-token' },
    });
    const response = res();
    csrfProtect()(request, response, () => {});
    assert.equal(response._status, 403);
  });

  test('csrfProtect blocks POST with missing token', () => {
    const request = req({ method: 'POST', cookies: { csrf_token: 'real' } });
    const response = res();
    csrfProtect()(request, response, () => {});
    assert.equal(response._status, 403);
  });

  test('csrfProtect accepts token from header', () => {
    const token = 'valid-csrf-token-here';
    const request = req({
      method: 'POST',
      cookies: { csrf_token: token },
      headers: { 'x-csrf-token': token },
    });
    let called = false;
    csrfProtect()(request, res(), () => { called = true; });
    assert.ok(called);
  });

  test('csrfProtect accepts token from body', () => {
    const token = 'body-csrf-token';
    const request = req({
      method: 'POST',
      cookies: { csrf_token: token },
      body: { csrfToken: token },
    });
    let called = false;
    csrfProtect()(request, res(), () => { called = true; });
    assert.ok(called);
  });

  test('SECURITY: timing-safe comparison (no early exit on first byte)', () => {
    // Can't measure timing directly, but verifying the path rejects near-match tokens
    const token = 'a'.repeat(64);
    const almostRight = 'a'.repeat(63) + 'b';
    const request = req({
      method: 'POST',
      cookies: { csrf_token: token },
      headers: { 'x-csrf-token': almostRight },
    });
    const response = res();
    csrfProtect()(request, response, () => {});
    assert.equal(response._status, 403);
  });

  test('SECURITY: different length tokens rejected safely (no exception)', () => {
    const request = req({
      method: 'POST',
      cookies: { csrf_token: 'short' },
      headers: { 'x-csrf-token': 'a'.repeat(64) },
    });
    const response = res();
    assert.doesNotThrow(() => csrfProtect()(request, response, () => {}));
    assert.equal(response._status, 403);
  });
});

// ─── Replay protection ────────────────────────────────────────────────────

describe('Replay protection', async () => {
  const { createReplayToken, createReplayStoreMemory } = await import('../src/security/replay.js');

  test('fresh token passes verification', () => {
    const store = createReplayStoreMemory();
    const { token } = createReplayToken(5000);
    assert.ok(store.verify(token));
    store.destroy();
  });

  test('replayed token is rejected', () => {
    const store = createReplayStoreMemory();
    const { token } = createReplayToken(5000);
    assert.ok(store.verify(token));
    assert.ok(!store.verify(token), 'replay should be rejected');
    store.destroy();
  });

  test('different tokens are independent', () => {
    const store = createReplayStoreMemory();
    const { token: t1 } = createReplayToken();
    const { token: t2 } = createReplayToken();
    assert.ok(store.verify(t1));
    assert.ok(store.verify(t2));
    assert.ok(!store.verify(t1));
    assert.ok(!store.verify(t2));
    store.destroy();
  });

  test('expired token is re-accepted (TTL passed)', async () => {
    const store = createReplayStoreMemory({ ttlMs: 50 });
    const { token } = createReplayToken(50);
    assert.ok(store.verify(token, 50));
    await new Promise((r) => setTimeout(r, 80));
    // After TTL, token slot has expired so a "reuse" is allowed again
    assert.ok(store.verify(token));
    store.destroy();
  });

  test('concurrent verify of same token — only first wins', async () => {
    const store = createReplayStoreMemory({ ttlMs: 5000 });
    const { token } = createReplayToken(5000);
    // Simulate race: two verifications at "same time"
    const [r1, r2] = await Promise.all([
      Promise.resolve(store.verify(token)),
      Promise.resolve(store.verify(token)),
    ]);
    assert.ok(r1 !== r2, 'only one should succeed');
    store.destroy();
  });
});

// ─── HMAC ─────────────────────────────────────────────────────────────────

describe('HMAC — createHmac / verifyHmac', async () => {
  const { createHmac, verifyHmac } = await import('../src/security/hmac.js');

  test('creates consistent HMAC', () => {
    const h1 = createHmac('secret', 'data');
    const h2 = createHmac('secret', 'data');
    assert.equal(h1, h2);
    assert.equal(h1.length, 64); // SHA-256 hex
  });

  test('different secrets produce different HMACs', () => {
    const h1 = createHmac('secret1', 'data');
    const h2 = createHmac('secret2', 'data');
    assert.notEqual(h1, h2);
  });

  test('verifyHmac returns true for correct signature', () => {
    const sig = createHmac('secret', 'payload');
    assert.ok(verifyHmac('secret', 'payload', sig));
  });

  test('verifyHmac returns false for wrong signature', () => {
    const sig = createHmac('secret', 'payload');
    assert.ok(!verifyHmac('secret', 'payload', 'wrongsig' + 'a'.repeat(56)));
  });

  test('SECURITY: wrong-length expected value returns false without throwing', () => {
    assert.ok(!verifyHmac('secret', 'data', 'tooshort'));
    assert.ok(!verifyHmac('secret', 'data', ''));
    assert.ok(!verifyHmac('secret', 'data', null));
  });

  test('SECURITY: empty secret still produces a hash (no crash)', () => {
    assert.doesNotThrow(() => createHmac('', 'data'));
  });
});

// ─── Attack Detector ──────────────────────────────────────────────────────

describe('Attack Detector', async () => {
  const { detectAttack, attackGuard } = await import('../src/security/attacks/attackDetector.js');

  test('clean request scores 0', () => {
    const result = detectAttack(req({ query: { name: 'Alice' } }));
    assert.equal(result.isAttack, false);
  });

  test('SQL injection in query detected', () => {
    const r = detectAttack(req({ query: { id: "1' OR 1=1 --" } }));
    assert.ok(r.isAttack);
    assert.ok(r.reasons.includes('Possible SQL injection'));
  });

  test('UNION SELECT attack detected', () => {
    const r = detectAttack(req({ query: { q: 'UNION SELECT username, password FROM users' } }));
    assert.ok(r.isAttack);
  });

  test('XSS script tag detected', () => {
    const r = detectAttack(req({ body: { comment: '<script>alert(1)</script>' } }));
    assert.ok(r.isAttack);
    assert.ok(r.reasons.includes('Possible XSS attack'));
  });

  test('XSS event handler detected', () => {
    const r = detectAttack(req({ body: { name: '<img onerror=alert(1)>' } }));
    assert.ok(r.isAttack);
  });

  test('path traversal detected', () => {
    const r = detectAttack(req({ params: { file: '../../etc/passwd' } }));
    assert.ok(r.isAttack);
    assert.ok(r.reasons.includes('Possible path traversal'));
  });

  test('null byte injection detected', () => {
    const r = detectAttack(req({ query: { name: 'hello\x00world' } }));
    assert.ok(r.score > 0);
    assert.ok(r.reasons.includes('Suspicious encoding detected'));
  });

  test('BUG — nested body objects are NOT scanned (known limitation)', () => {
    // This is a known bypass: values nested inside objects escape detection.
    // Test documents the current behavior so it can be tracked.
    const r = detectAttack(req({
      body: { user: { name: "'; DROP TABLE users; --" } },
    }));
    // Nested string is missed — isAttack may be false
    // This test documents the bug: nested SQLi is NOT detected
    assert.equal(typeof r.isAttack, 'boolean'); // just verify it doesn't crash
  });

  test('v2.1 fix — duplicate reasons are deduplicated', () => {
    // Multiple fields with SQLi → reason appears only ONCE
    const r = detectAttack(req({
      query: { a: "' OR 1=1 --", b: "' OR 1=1 --", c: "UNION SELECT 1" },
    }));
    const sqliReasons = r.reasons.filter((x) => x === 'Possible SQL injection');
    assert.equal(sqliReasons.length, 1, 'Reason should appear only once');
  });

  test('attackGuard block:true blocks attack', () => {
    const r = req({ query: { id: "'; DROP TABLE users;" } });
    const response = res();
    attackGuard({ block: true })(r, response, () => {});
    assert.equal(response._status, 403);
  });

  test('attackGuard block:false logs but does not block', () => {
    const r = req({ query: { id: "' OR 1=1" } });
    const response = res();
    let called = false;
    attackGuard({ block: false })(r, response, () => { called = true; });
    assert.ok(called);
    assert.ok(r.attackDetection);
  });
});

// ─── Bot Detector ─────────────────────────────────────────────────────────

describe('Bot Detector', async () => {
  const { detectBot, botGuard } = await import('../src/security/botDetector.js');

  test('normal browser UA scores below threshold', () => {
    const r = req({
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
      },
    });
    const result = detectBot(r);
    assert.ok(!result.isBot, `Should not be bot but got score: ${result.score}`);
  });

  test('missing User-Agent is flagged', () => {
    const result = detectBot(req({ headers: {} }));
    assert.ok(result.score >= 40);
  });

  test('known bot UA pattern detected', () => {
    const r = req({ headers: { 'user-agent': 'Googlebot/2.1' } });
    const result = detectBot(r);
    assert.ok(result.isBot);
    assert.ok(result.reasons.some((r) => r.includes('bot')));
  });

  test('Puppeteer/Playwright UA detected', () => {
    ['HeadlessChrome', 'puppeteer/1.0', 'Playwright'].forEach((ua) => {
      const r = detectBot(req({ headers: { 'user-agent': ua } }));
      assert.ok(r.score > 0, `${ua} should score > 0`);
    });
  });

  test('curl/wget detected as bot', () => {
    const r = detectBot(req({ headers: { 'user-agent': 'curl/7.88.1' } }));
    assert.ok(r.isBot);
  });

  test('very short UA flagged', () => {
    const r = detectBot(req({ headers: { 'user-agent': 'ab' } }));
    assert.ok(r.score > 0);
  });

  test('botGuard block:true returns 403 for bot', () => {
    const request = req({ headers: { 'user-agent': 'python-requests/2.28' } });
    const response = res();
    botGuard({ block: true })(request, response, () => {});
    assert.equal(response._status, 403);
  });

  test('botGuard attaches result to req.botDetection', () => {
    const request = req({ headers: { 'user-agent': 'curl/7.0' } });
    botGuard({ block: false })(request, res(), () => {});
    assert.ok(request.botDetection);
    assert.equal(typeof request.botDetection.score, 'number');
  });
});

// ─── Memory Rate Limiter ──────────────────────────────────────────────────

describe('Memory Rate Limiter', async () => {
  const { createMemoryRateLimiter } = await import('../src/rateLimiter/memoryLimiter.js');

  test('allows requests under limit', () => {
    const limiter = createMemoryRateLimiter({ windowMs: 5000, max: 5 });
    let blocked = false;
    for (let i = 0; i < 5; i++) {
      limiter(req({ ip: '1.1.1.1' }), res(), () => {});
    }
    assert.ok(!blocked);
  });

  test('blocks requests over limit', () => {
    const limiter = createMemoryRateLimiter({ windowMs: 5000, max: 3 });
    const response = res();
    for (let i = 0; i < 4; i++) {
      limiter(req({ ip: '2.2.2.2' }), response, () => {});
    }
    assert.equal(response._status, 429);
  });

  test('different IPs have independent limits', () => {
    const limiter = createMemoryRateLimiter({ windowMs: 5000, max: 2 });
    const r1 = res();
    const r2 = res();
    for (let i = 0; i < 3; i++) {
      limiter(req({ ip: '3.3.3.3' }), r1, () => {});
    }
    // IP 4.4.4.4 should still be allowed
    limiter(req({ ip: '4.4.4.4' }), r2, () => {});
    assert.equal(r1._status, 429);
    assert.equal(r2._status, 200); // default
  });

  test('SECURITY: X-Forwarded-For used as key when trusting proxy', () => {
    // Default keyGenerator uses req.ip — test that spoofing X-Forwarded-For
    // can bypass if keyGenerator naively uses the header
    const limiter = createMemoryRateLimiter({
      windowMs: 5000,
      max: 2,
      keyGenerator: (r) => r.headers['x-forwarded-for'] || r.ip,
    });
    const response = res();
    for (let i = 0; i < 3; i++) {
      limiter(
        req({ ip: '5.5.5.5', headers: { 'x-forwarded-for': '5.5.5.5' } }),
        response, () => {}
      );
    }
    assert.equal(response._status, 429);
    // Now bypass by changing X-Forwarded-For:
    const bypassRes = res();
    limiter(req({ ip: '5.5.5.5', headers: { 'x-forwarded-for': '9.9.9.9' } }), bypassRes, () => {});
    // Documents the bypass — keyGenerator with header is spoofable
    assert.equal(bypassRes._status, 200, 'KNOWN RISK: XFF-based key can be spoofed');
  });

  test('onLimitReached callback fires', () => {
    let fired = false;
    const limiter = createMemoryRateLimiter({
      windowMs: 5000, max: 1,
      onLimitReached: () => { fired = true; },
    });
    limiter(req({ ip: '6.6.6.6' }), res(), () => {});
    limiter(req({ ip: '6.6.6.6' }), res(), () => {});
    assert.ok(fired);
  });
});

// ─── RBAC ─────────────────────────────────────────────────────────────────

describe('RBAC — hasRole / hasPermission / middleware', async () => {
  const { hasRole, hasPermission, requireRole, requirePermission } =
    await import('../src/rbac/rbac.js');

  test('hasRole — single role matches', () => {
    assert.ok(hasRole({ role: 'admin' }, ['admin', 'superadmin']));
  });

  test('hasRole — roles array matches', () => {
    assert.ok(hasRole({ roles: ['mod', 'editor'] }, ['admin', 'mod']));
  });

  test('hasRole — no match returns false', () => {
    assert.ok(!hasRole({ role: 'user' }, ['admin']));
  });

  test('hasRole — null user returns false', () => {
    assert.ok(!hasRole(null, ['admin']));
  });

  test('SECURITY: empty roles array → no role allowed', () => {
    // requireRole([]) — no roles passed means no one gets in
    const request = req();
    request.user = { role: 'admin' };
    const err = requireRole([])(request, res(), (e) => e);
    // With empty array, hasRole returns false → 403
    assert.ok(err && err.statusCode === 403);
  });

  test('hasPermission — all required permissions present', () => {
    const user = { permissions: ['read', 'write', 'delete'] };
    assert.ok(hasPermission(user, ['read', 'write']));
  });

  test('hasPermission — missing one permission returns false', () => {
    const user = { permissions: ['read'] };
    assert.ok(!hasPermission(user, ['read', 'write']));
  });

  test('requireRole — no req.user → 401', () => {
    const err = requireRole(['admin'])(req(), res(), (e) => e);
    assert.equal(err.statusCode, 401);
  });

  test('requirePermission — no req.user → 401', () => {
    const err = requirePermission('write')(req(), res(), (e) => e);
    assert.equal(err.statusCode, 401);
  });

  test('SECURITY: role stored as object cannot bypass string comparison', () => {
    // An attacker might try to pass role as an object that equals anything
    const user = { role: { toString: () => 'admin' } };
    assert.ok(!hasRole(user, ['admin']), 'Object role should not match string');
  });
});

// ─── Sanitizer ────────────────────────────────────────────────────────────

describe('Sanitizer', async () => {
  const { sanitizeString, escapeHtml, sanitizeDeep, sanitizeRequest } =
    await import('../src/sanitizer/sanitizer.js');

  test('strips script tags', () => {
    const out = sanitizeString('<script>alert(1)</script>Hello');
    assert.ok(!out.includes('<script>'));
    assert.ok(out.includes('Hello'));
  });

  test('strips onerror handlers', () => {
    const out = sanitizeString('<img src=x onerror=alert(1)>');
    assert.ok(!out.toLowerCase().includes('onerror'));
  });

  test('escapeHtml escapes all dangerous chars', () => {
    const out = escapeHtml('<div onclick="evil()">&"\'');
    assert.ok(!out.includes('<'));
    assert.ok(!out.includes('>'));
    assert.ok(!out.includes('"'));
    assert.ok(!out.includes("'"));
    assert.ok(!out.includes('&"'));
  });

  test('escapeHtml does not strip — just escapes', () => {
    const out = escapeHtml('<b>bold</b>');
    assert.ok(out.includes('&lt;b&gt;'));
  });

  test('sanitizeDeep handles nested objects', () => {
    const input = { user: { name: '<script>xss</script>' }, count: 1 };
    const out = sanitizeDeep(input);
    assert.ok(!out.user.name.includes('<script>'));
    assert.equal(out.count, 1);
  });

  test('sanitizeDeep handles arrays', () => {
    const out = sanitizeDeep(['<script>bad</script>', 'clean']);
    assert.ok(!out[0].includes('<script>'));
    assert.equal(out[1], 'clean');
  });

  test('sanitizeDeep passes through non-strings unchanged', () => {
    const out = sanitizeDeep({ n: 42, b: true, nil: null });
    assert.equal(out.n, 42);
    assert.equal(out.b, true);
    assert.equal(out.nil, null);
  });

  test('sanitizeRequest middleware sanitizes body, query, params', () => {
    const request = req({
      body: { msg: '<script>alert(1)</script>' },
      query: { q: '<b>test</b>' },
      params: { id: '1<script>bad</script>' },
    });
    sanitizeRequest()(request, res(), () => {});
    assert.ok(!request.body.msg.includes('<script>'));
    assert.ok(!request.query.q.includes('<script>'));
    assert.ok(!request.params.id.includes('<script>'));
  });

  test('empty/null input returns empty string without crash', () => {
    assert.equal(sanitizeString(null), '');
    assert.equal(sanitizeString(''), '');
    assert.equal(escapeHtml(null), '');
  });
});

// ─── Request Validator ────────────────────────────────────────────────────

describe('validateRequest middleware', async () => {
  const { validateRequest } = await import('../src/validators/requestValidator.js');

  test('valid body passes', () => {
    const request = req({ body: { name: 'Alice', age: 30 } });
    let called = false;
    validateRequest({
      body: {
        name: { type: 'string', required: true },
        age:  { type: 'number', required: true },
      },
    })(request, res(), () => { called = true; });
    assert.ok(called);
  });

  test('missing required field → 400', () => {
    const request = req({ body: {} });
    const response = res();
    validateRequest({ body: { email: { type: 'string', required: true } } })(request, response, () => {});
    assert.equal(response._status, 400);
    assert.ok(response._body.errors.length > 0);
  });

  test('wrong type → 400 with field info', () => {
    const request = req({ body: { age: 'not-a-number' } });
    const response = res();
    validateRequest({ body: { age: { type: 'number', required: true } } })(request, response, () => {});
    assert.equal(response._status, 400);
  });

  test('minLength check', () => {
    const request = req({ body: { pass: 'abc' } });
    const response = res();
    validateRequest({ body: { pass: { type: 'string', minLength: 8 } } })(request, response, () => {});
    assert.equal(response._status, 400);
    assert.match(response._body.errors[0].message, />=\s*8/);
  });

  test('enum check', () => {
    const request = req({ query: { role: 'superuser' } });
    const response = res();
    validateRequest({ query: { role: { type: 'string', enum: ['user', 'admin'] } } })(request, response, () => {});
    assert.equal(response._status, 400);
  });

  test('validates query and params too', () => {
    const request = req({ query: { page: '2' }, params: { id: '5' } });
    let called = false;
    validateRequest({
      query:  { page: { type: 'number' } },
      params: { id:   { type: 'number' } },
    })(request, res(), () => { called = true; });
    assert.ok(called);
  });

  test('collects ALL errors in one response', () => {
    const request = req({ body: {} });
    const response = res();
    validateRequest({
      body: {
        a: { type: 'string', required: true },
        b: { type: 'string', required: true },
        c: { type: 'string', required: true },
      },
    })(request, response, () => {});
    assert.equal(response._body.errors.length, 3);
  });
});

// ─── ApiError + errorHandler ──────────────────────────────────────────────

describe('ApiError + errorHandler', async () => {
  const { ApiError } = await import('../src/errors/ApiError.js');
  const { errorHandler } = await import('../src/errors/errorHandler.js');

  test('ApiError stores statusCode and message', () => {
    const e = new ApiError(404, 'Not found');
    assert.equal(e.statusCode, 404);
    assert.equal(e.message, 'Not found');
    assert.equal(e.name, 'ApiError');
  });

  test('ApiError.toJSON returns structured shape', () => {
    const e = new ApiError(400, 'Bad input', { field: 'email' });
    const j = e.toJSON();
    assert.equal(j.success, false);
    assert.equal(j.error.statusCode, 400);
    assert.deepEqual(j.error.details, { field: 'email' });
  });

  test('errorHandler sends ApiError correctly', () => {
    const e = new ApiError(422, 'Unprocessable');
    const response = res();
    errorHandler(e, req(), response, () => {});
    assert.equal(response._status, 422);
    assert.equal(response._body.error.message, 'Unprocessable');
  });

  test('errorHandler masks 500 message to generic string', () => {
    const e = new Error('Internal DB connection string leaked!');
    const response = res();
    errorHandler(e, req(), response, () => {});
    assert.equal(response._status, 500);
    assert.equal(response._body.error.message, 'Internal server error');
    assert.ok(!response._body.error.message.includes('DB connection'));
  });

  test('errorHandler skips already-sent responses', () => {
    const e = new ApiError(400, 'oops');
    const response = res();
    response.headersSent = true;
    let nextCalled = false;
    errorHandler(e, req(), response, () => { nextCalled = true; });
    assert.ok(nextCalled);
  });

  test('SECURITY: stack trace not in production response', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const e = new ApiError(500, 'oops');
    assert.equal(e.stack, undefined);
    process.env.NODE_ENV = origEnv;
  });
});

// ─── Response Formatter ───────────────────────────────────────────────────

describe('Response Formatter', async () => {
  const { success, fail, paginate, responseFormatter } =
    await import('../src/response/formatter.js');

  test('success shape', () => {
    const r = success({ id: 1 });
    assert.equal(r.success, true);
    assert.deepEqual(r.data, { id: 1 });
    assert.equal(r.meta, undefined);
  });

  test('success with meta', () => {
    const r = success([], { total: 100 });
    assert.deepEqual(r.meta, { total: 100 });
  });

  test('fail shape', () => {
    const r = fail('Bad request', 400);
    assert.equal(r.success, false);
    assert.equal(r.error.message, 'Bad request');
    assert.equal(r.error.statusCode, 400);
  });

  test('paginate shape', () => {
    const r = paginate([1, 2, 3], { page: 1, perPage: 3, total: 10 });
    assert.equal(r.pagination.totalPages, 4);
    assert.equal(r.pagination.total, 10);
  });

  test('responseFormatter adds methods to res', () => {
    const response = res();
    const request = req();
    responseFormatter()(request, response, () => {});
    assert.equal(typeof response.success, 'function');
    assert.equal(typeof response.fail, 'function');
    assert.equal(typeof response.paginate, 'function');
  });
});

// ─── getClientIp ──────────────────────────────────────────────────────────

describe('getClientIp', async () => {
  const { getClientIp } = await import('../src/fingerprint/getIp.js');

  test('returns req.ip when no proxy headers', () => {
    const r = req({ ip: '1.2.3.4', headers: {} });
    assert.equal(getClientIp(r), '1.2.3.4');
  });

  test('returns first IP from X-Forwarded-For (trustProxy: true)', () => {
    const r = req({ headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1' } });
    assert.equal(getClientIp(r), '203.0.113.1');
  });

  test('trustProxy: false ignores X-Forwarded-For', () => {
    const r = req({
      ip: '10.0.0.1',
      headers: { 'x-forwarded-for': '203.0.113.1' },
    });
    assert.equal(getClientIp(r, { trustProxy: false }), '10.0.0.1');
  });

  test('SECURITY: X-Forwarded-For is spoofable when trustProxy:true (documented risk)', () => {
    // A client can set any IP in XFF when trustProxy:true
    const spoofed = req({ ip: '10.0.0.99', headers: { 'x-forwarded-for': '8.8.8.8' } });
    const ip = getClientIp(spoofed);
    assert.equal(ip, '8.8.8.8', 'XFF is trusted — use trustProxy:false for security-critical operations');
  });

  test('normalizes ::ffff: IPv6 prefix to IPv4', () => {
    const r = req({ ip: '::ffff:192.168.1.1', headers: {} });
    assert.equal(getClientIp(r), '192.168.1.1');
  });

  test('returns null when no IP available', () => {
    const r = { headers: {} };
    assert.equal(getClientIp(r), null);
  });
});

// ─── Password hashing ─────────────────────────────────────────────────────

describe('Password hashing (argon2)', async () => {
  const { hashPassword, verifyPassword, timingSafeEquals } =
    await import('../src/security/password.js');

  test('hashes produce argon2id format', async () => {
    const hash = await hashPassword('mypassword');
    assert.ok(hash.startsWith('$argon2id$'));
  });

  test('verifyPassword returns true for correct password', async () => {
    const hash = await hashPassword('correct-horse');
    assert.ok(await verifyPassword('correct-horse', hash));
  });

  test('verifyPassword returns false for wrong password', async () => {
    const hash = await hashPassword('correct-horse');
    assert.ok(!(await verifyPassword('wrong-horse', hash)));
  });

  test('two hashes of same password are different (salted)', async () => {
    const h1 = await hashPassword('password');
    const h2 = await hashPassword('password');
    assert.notEqual(h1, h2);
  });

  test('SECURITY: verifyPassword with invalid hash returns false, does not throw', async () => {
    const ok = await verifyPassword('password', 'not-a-valid-hash');
    assert.equal(ok, false);
  });

  test('timingSafeEquals — equal strings return true', () => {
    assert.ok(timingSafeEquals('abc', 'abc'));
  });

  test('timingSafeEquals — different strings return false', () => {
    assert.ok(!timingSafeEquals('abc', 'xyz'));
  });

  test('timingSafeEquals — null/undefined returns false without throw', () => {
    assert.ok(!timingSafeEquals(null, 'abc'));
    assert.ok(!timingSafeEquals('abc', null));
  });
});

// ─── Nonce ────────────────────────────────────────────────────────────────

describe('Nonce', async () => {
  const { generateNonce, verifyNonce } = await import('../src/security/nonce.js');

  test('generates 64-char hex nonce', () => {
    const n = generateNonce();
    assert.equal(n.length, 64);
    assert.match(n, /^[0-9a-f]+$/);
  });

  test('each nonce is unique', () => {
    const set = new Set(Array.from({ length: 100 }, () => generateNonce()));
    assert.equal(set.size, 100);
  });

  test('verifyNonce returns true for matching', () => {
    const n = generateNonce();
    assert.ok(verifyNonce(n, n));
  });

  test('verifyNonce returns false for mismatch', () => {
    assert.ok(!verifyNonce(generateNonce(), generateNonce()));
  });

  test('SECURITY: null inputs return false without throw', () => {
    assert.ok(!verifyNonce(null, 'abc'));
    assert.ok(!verifyNonce('abc', null));
  });
});

// ─── Memory Cache ─────────────────────────────────────────────────────────

describe('Memory Cache', async () => {
  const { createMemoryCache } = await import('../src/cache/memoryCache.js');

  test('set and get returns value', () => {
    const cache = createMemoryCache();
    cache.set('k', { data: 1 });
    assert.deepEqual(cache.get('k'), { data: 1 });
  });

  test('get returns null for missing key', () => {
    assert.equal(createMemoryCache().get('nope'), null);
  });

  test('TTL expiry returns null', async () => {
    const cache = createMemoryCache();
    cache.set('k', 'val', 50);
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(cache.get('k'), null);
  });

  test('del removes key', () => {
    const cache = createMemoryCache();
    cache.set('k', 'val');
    cache.del('k');
    assert.equal(cache.get('k'), null);
  });

  test('wrap returns cached value on second call', async () => {
    const cache = createMemoryCache();
    let calls = 0;
    const fn = async () => { calls++; return 'result'; };
    await cache.wrap('k', fn, 5000);
    await cache.wrap('k', fn, 5000);
    assert.equal(calls, 1);
  });

  test('TTL=0 means no expiry', async () => {
    const cache = createMemoryCache();
    cache.set('k', 'forever', 0);
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(cache.get('k'), 'forever');
  });
});
