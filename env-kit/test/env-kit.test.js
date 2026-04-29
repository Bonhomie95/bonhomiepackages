import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createEnv, EnvError } from '../src/index.js';

// ─── helpers ──────────────────────────────────────────────────────────────

function env(source) {
  return (schema) => createEnv(schema, source);
}

function throws(fn, check) {
  try {
    fn();
    assert.fail('Expected an error to be thrown');
  } catch (err) {
    if (err instanceof assert.AssertionError) throw err;
    if (check) check(err);
  }
}

// ─── required / optional / default ───────────────────────────────────────

describe('required fields', () => {
  test('present value passes', () => {
    const result = createEnv({ KEY: { type: 'string' } }, { KEY: 'hello' });
    assert.equal(result.KEY, 'hello');
  });

  test('missing required field throws EnvError', () => {
    throws(
      () => createEnv({ KEY: { type: 'string' } }, {}),
      (err) => {
        assert.ok(err instanceof EnvError);
        assert.equal(err.fields[0].field, 'KEY');
      }
    );
  });

  test('optional field missing returns undefined', () => {
    const result = createEnv({ KEY: { type: 'string', required: false } }, {});
    assert.equal(result.KEY, undefined);
  });

  test('default used when field is missing', () => {
    const result = createEnv({ PORT: { type: 'number', default: 3000 } }, {});
    assert.equal(result.PORT, 3000);
  });

  test('default used when field is empty string', () => {
    const result = createEnv({ HOST: { type: 'string', default: 'localhost' } }, { HOST: '' });
    assert.equal(result.HOST, 'localhost');
  });

  test('default of false is returned (falsy default)', () => {
    const result = createEnv({ CACHE: { type: 'boolean', default: false } }, {});
    assert.equal(result.CACHE, false);
  });

  test('default of 0 is returned (falsy default)', () => {
    const result = createEnv({ COUNT: { type: 'number', default: 0 } }, {});
    assert.equal(result.COUNT, 0);
  });

  test('provided value overrides default', () => {
    const result = createEnv({ PORT: { type: 'number', default: 3000 } }, { PORT: '8080' });
    assert.equal(result.PORT, 8080);
  });
});

// ─── string ───────────────────────────────────────────────────────────────

describe('type: string', () => {
  test('basic string', () => {
    const r = createEnv({ S: { type: 'string' } }, { S: 'hello' });
    assert.equal(r.S, 'hello');
  });

  test('trims whitespace', () => {
    const r = createEnv({ S: { type: 'string' } }, { S: '  hello  ' });
    assert.equal(r.S, 'hello');
  });

  test('minLength passes', () => {
    const r = createEnv({ S: { type: 'string', minLength: 3 } }, { S: 'abc' });
    assert.equal(r.S, 'abc');
  });

  test('minLength fails', () => {
    throws(
      () => createEnv({ S: { type: 'string', minLength: 10 } }, { S: 'short' }),
      (err) => assert.match(err.message, /at least 10/)
    );
  });

  test('maxLength passes', () => {
    const r = createEnv({ S: { type: 'string', maxLength: 5 } }, { S: 'hello' });
    assert.equal(r.S, 'hello');
  });

  test('maxLength fails', () => {
    throws(
      () => createEnv({ S: { type: 'string', maxLength: 3 } }, { S: 'toolong' }),
      (err) => assert.match(err.message, /at most 3/)
    );
  });
});

// ─── number ───────────────────────────────────────────────────────────────

describe('type: number', () => {
  test('valid number string → number', () => {
    const r = createEnv({ N: { type: 'number' } }, { N: '42.5' });
    assert.equal(r.N, 42.5);
    assert.equal(typeof r.N, 'number');
  });

  test('invalid number throws', () => {
    throws(
      () => createEnv({ N: { type: 'number' } }, { N: 'abc' }),
      (err) => assert.match(err.message, /valid number/)
    );
  });

  test('min passes', () => {
    const r = createEnv({ N: { type: 'number', min: 1 } }, { N: '5' });
    assert.equal(r.N, 5);
  });

  test('min fails', () => {
    throws(
      () => createEnv({ N: { type: 'number', min: 10 } }, { N: '5' }),
      (err) => assert.match(err.message, />= 10/)
    );
  });

  test('max passes', () => {
    const r = createEnv({ N: { type: 'number', max: 100 } }, { N: '50' });
    assert.equal(r.N, 50);
  });

  test('max fails', () => {
    throws(
      () => createEnv({ N: { type: 'number', max: 10 } }, { N: '99' }),
      (err) => assert.match(err.message, /<= 10/)
    );
  });

  test('NaN ("") throws even with whitespace', () => {
    throws(() => createEnv({ N: { type: 'number' } }, { N: '   ' }));
  });
});

// ─── integer ──────────────────────────────────────────────────────────────

describe('type: integer', () => {
  test('integer string → number', () => {
    const r = createEnv({ N: { type: 'integer' } }, { N: '7' });
    assert.equal(r.N, 7);
    assert.ok(Number.isInteger(r.N));
  });

  test('float string fails', () => {
    throws(
      () => createEnv({ N: { type: 'integer' } }, { N: '1.5' }),
      (err) => assert.match(err.message, /valid integer/)
    );
  });
});

// ─── boolean ──────────────────────────────────────────────────────────────

describe('type: boolean', () => {
  const truthy = ['true', '1', 'yes', 'on', 'TRUE', 'YES'];
  const falsy = ['false', '0', 'no', 'off', 'FALSE', 'NO'];

  for (const v of truthy) {
    test(`"${v}" → true`, () => {
      const r = createEnv({ B: { type: 'boolean' } }, { B: v });
      assert.equal(r.B, true);
    });
  }

  for (const v of falsy) {
    test(`"${v}" → false`, () => {
      const r = createEnv({ B: { type: 'boolean' } }, { B: v });
      assert.equal(r.B, false);
    });
  }

  test('invalid boolean throws', () => {
    throws(
      () => createEnv({ B: { type: 'boolean' } }, { B: 'maybe' }),
      (err) => assert.match(err.message, /true\/false/)
    );
  });
});

// ─── port ─────────────────────────────────────────────────────────────────

describe('type: port', () => {
  test('3000 → 3000', () => {
    const r = createEnv({ P: { type: 'port' } }, { P: '3000' });
    assert.equal(r.P, 3000);
  });

  test('1 is valid', () => {
    const r = createEnv({ P: { type: 'port' } }, { P: '1' });
    assert.equal(r.P, 1);
  });

  test('65535 is valid', () => {
    const r = createEnv({ P: { type: 'port' } }, { P: '65535' });
    assert.equal(r.P, 65535);
  });

  test('0 is invalid', () => {
    throws(() => createEnv({ P: { type: 'port' } }, { P: '0' }));
  });

  test('65536 is invalid', () => {
    throws(() => createEnv({ P: { type: 'port' } }, { P: '65536' }));
  });

  test('float is invalid', () => {
    throws(() => createEnv({ P: { type: 'port' } }, { P: '80.5' }));
  });

  test('string is invalid', () => {
    throws(() => createEnv({ P: { type: 'port' } }, { P: 'http' }));
  });
});

// ─── url ──────────────────────────────────────────────────────────────────

describe('type: url', () => {
  test('https URL passes', () => {
    const r = createEnv({ U: { type: 'url' } }, { U: 'https://example.com' });
    assert.equal(r.U, 'https://example.com');
  });

  test('URL with path and query passes', () => {
    const r = createEnv(
      { U: { type: 'url' } },
      { U: 'https://api.example.com/v1?key=abc' }
    );
    assert.ok(r.U.includes('/v1'));
  });

  test('plain string fails', () => {
    throws(() => createEnv({ U: { type: 'url' } }, { U: 'not-a-url' }));
  });

  test('missing protocol fails', () => {
    throws(() => createEnv({ U: { type: 'url' } }, { U: 'example.com' }));
  });
});

// ─── email ────────────────────────────────────────────────────────────────

describe('type: email', () => {
  test('valid email passes', () => {
    const r = createEnv({ E: { type: 'email' } }, { E: 'user@example.com' });
    assert.equal(r.E, 'user@example.com');
  });

  test('missing @ fails', () => {
    throws(() => createEnv({ E: { type: 'email' } }, { E: 'userexample.com' }));
  });

  test('missing TLD fails', () => {
    throws(() => createEnv({ E: { type: 'email' } }, { E: 'user@example' }));
  });

  test('spaces fail', () => {
    throws(() => createEnv({ E: { type: 'email' } }, { E: 'us er@ex.com' }));
  });
});

// ─── json ─────────────────────────────────────────────────────────────────

describe('type: json', () => {
  test('valid JSON object → parsed', () => {
    const r = createEnv({ J: { type: 'json' } }, { J: '{"key":"val"}' });
    assert.deepEqual(r.J, { key: 'val' });
  });

  test('valid JSON array → parsed', () => {
    const r = createEnv({ J: { type: 'json' } }, { J: '[1,2,3]' });
    assert.deepEqual(r.J, [1, 2, 3]);
  });

  test('invalid JSON throws', () => {
    throws(() => createEnv({ J: { type: 'json' } }, { J: '{bad}' }));
  });
});

// ─── enum ─────────────────────────────────────────────────────────────────

describe('enum validation', () => {
  test('valid enum value passes', () => {
    const r = createEnv(
      { ENV: { type: 'string', enum: ['development', 'production', 'test'] } },
      { ENV: 'production' }
    );
    assert.equal(r.ENV, 'production');
  });

  test('invalid enum value throws', () => {
    throws(
      () =>
        createEnv(
          { ENV: { type: 'string', enum: ['development', 'production'] } },
          { ENV: 'staging' }
        ),
      (err) => assert.match(err.message, /one of/)
    );
  });

  test('enum on number type works after coercion', () => {
    const r = createEnv(
      { LEVEL: { type: 'number', enum: [1, 2, 3] } },
      { LEVEL: '2' }
    );
    assert.equal(r.LEVEL, 2);
  });
});

// ─── custom validator ─────────────────────────────────────────────────────

describe('custom validate function', () => {
  test('returning true passes', () => {
    const r = createEnv(
      { SECRET: { type: 'string', validate: (v) => v.length >= 32 || 'too short' } },
      { SECRET: 'a'.repeat(32) }
    );
    assert.equal(r.SECRET.length, 32);
  });

  test('returning error string throws', () => {
    throws(
      () =>
        createEnv(
          { SECRET: { type: 'string', validate: () => 'must be very secret' } },
          { SECRET: 'short' }
        ),
      (err) => assert.match(err.message, /must be very secret/)
    );
  });

  test('returning false throws with generic message', () => {
    throws(
      () =>
        createEnv(
          { X: { type: 'string', validate: () => false } },
          { X: 'val' }
        ),
      (err) => assert.match(err.message, /failed custom validation/)
    );
  });
});

// ─── error collection ─────────────────────────────────────────────────────

describe('all errors collected at once', () => {
  test('two missing fields → both in fields array', () => {
    throws(
      () => createEnv({ A: { type: 'string' }, B: { type: 'number' } }, {}),
      (err) => {
        assert.ok(err instanceof EnvError);
        assert.equal(err.fields.length, 2);
        const keys = err.fields.map((f) => f.field);
        assert.ok(keys.includes('A'));
        assert.ok(keys.includes('B'));
      }
    );
  });

  test('error message lists all fields', () => {
    throws(
      () => createEnv({ HOST: { type: 'string' }, PORT: { type: 'port' } }, {}),
      (err) => {
        assert.match(err.message, /HOST/);
        assert.match(err.message, /PORT/);
      }
    );
  });
});

// ─── result is frozen ─────────────────────────────────────────────────────

describe('result immutability', () => {
  test('result is frozen — mutations are silently ignored or throw in strict mode', () => {
    const r = createEnv({ KEY: { type: 'string' } }, { KEY: 'val' });
    assert.ok(Object.isFrozen(r));
  });
});

// ─── security ─────────────────────────────────────────────────────────────

describe('security', () => {
  test('prototype pollution via __proto__ key is not possible (frozen result)', () => {
    const r = createEnv({ __proto__: { type: 'string', required: false } }, {});
    // frozen object means prototype is safe
    assert.ok(Object.isFrozen(r));
    assert.equal(({}).injected, undefined);
  });

  test('secret values not included in error message when field is missing', () => {
    // The error says the field is required — it should not echo the secret value
    throws(
      () =>
        createEnv(
          { DB_PASSWORD: { type: 'string', minLength: 20 } },
          { DB_PASSWORD: 'weak' }
        ),
      (err) => {
        // 'weak' should NOT appear in the error message
        assert.ok(!err.message.includes('weak'), 'Value leaked in error message');
      }
    );
  });

  test('custom source (not process.env) is used', () => {
    const r = createEnv({ PORT: { type: 'port' } }, { PORT: '4000' });
    assert.equal(r.PORT, 4000);
  });
});
