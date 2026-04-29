# @bonhomie/env-kit

Typed, validated environment variables for Node.js.

No more `if (!process.env.X) throw new Error(...)` scattered across 10 files. Define a schema once — env-kit validates at startup, collects **all** errors before throwing, and returns a frozen, typed object.

![npm](https://img.shields.io/npm/v/@bonhomie/env-kit)
![license](https://img.shields.io/npm/l/@bonhomie/env-kit)
![zero deps](https://img.shields.io/badge/dependencies-0-brightgreen)

---

## 📦 Installation

```bash
npm install @bonhomie/env-kit
```

---

## Quick Start

```js
import { createEnv } from "@bonhomie/env-kit";

export const env = createEnv({
  NODE_ENV:     { type: "string",  enum: ["development", "production", "test"], default: "development" },
  PORT:         { type: "port",    default: 3000 },
  DATABASE_URL: { type: "url",     required: true },
  JWT_SECRET:   { type: "string",  required: true, minLength: 32 },
  ADMIN_EMAIL:  { type: "email",   required: false },
  ENABLE_CACHE: { type: "boolean", default: false },
  MAX_UPLOAD:   { type: "number",  min: 1, max: 100, default: 10 },
  FEATURES:     { type: "json",    default: {} },
});

// All values are typed and coerced
console.log(env.PORT);         // number: 3000
console.log(env.ENABLE_CACHE); // boolean: false
console.log(env.FEATURES);     // object: {}
```

If any field fails, startup throws with **all** errors at once:

```
Environment validation failed — 2 errors:

  ✗  DATABASE_URL: is required but was not provided
  ✗  JWT_SECRET: must be at least 32 characters
```

---

## Types

| Type      | Accepts              | Returns           |
| --------- | -------------------- | ----------------- |
| `string`  | Any string           | `string` (trimmed)|
| `number`  | `"42"`, `"3.14"`     | `number`          |
| `integer` | `"7"`, `"100"`       | `number` (integer)|
| `boolean` | `true/false/1/0/yes/no/on/off` | `boolean` |
| `port`    | `"3000"`, `"8080"`   | `number` (1–65535)|
| `url`     | `"https://..."` (full URL) | `string`    |
| `email`   | `"user@domain.com"`  | `string`          |
| `json`    | `'{"key":"val"}'`    | Parsed value      |

---

## Field Options

| Option       | Type              | Description                                             |
| ------------ | ----------------- | ------------------------------------------------------- |
| `type`       | `FieldType`       | One of the types above. Default: `"string"`.            |
| `required`   | `boolean`         | Default: `true`. Set `false` to make optional.          |
| `default`    | `any`             | Returned when the variable is missing. Makes optional automatically. |
| `enum`       | `any[]`           | List of allowed values (checked after coercion).        |
| `min`        | `number`          | Minimum value for number/integer/port.                  |
| `max`        | `number`          | Maximum value for number/integer/port.                  |
| `minLength`  | `number`          | Minimum string length.                                  |
| `maxLength`  | `number`          | Maximum string length.                                  |
| `validate`   | `(v) => true\|string` | Custom validator. Return `true` to pass, or an error string. |
| `description`| `string`          | Human-readable description (for documentation tooling). |

---

## Custom Validator

```js
const env = createEnv({
  JWT_SECRET: {
    type: "string",
    validate: (v) => v.length >= 32 || "must be at least 32 characters",
  },
  DATABASE_URL: {
    type: "url",
    validate: (v) => v.startsWith("postgresql://") || "must be a PostgreSQL URL",
  },
});
```

---

## Custom Source

By default reads from `process.env`. Pass any object as the second argument for testing or alternative sources:

```js
const env = createEnv(
  { PORT: { type: "port", default: 3000 } },
  { PORT: "4000" }  // custom source
);
```

---

## Error Handling

```js
import { createEnv, EnvError } from "@bonhomie/env-kit";

try {
  const env = createEnv(schema);
} catch (err) {
  if (err instanceof EnvError) {
    console.error(err.message);      // full formatted message
    console.error(err.fields);       // [{ field: "PORT", message: "..." }, ...]
  }
}
```

---

## Notes

- The result is `Object.freeze`d — mutations are rejected in strict mode.
- Whitespace-only values are treated as missing (prevents silent `Number("   ") → 0` bugs).
- Zero dependencies.

---

## 📄 License

MIT — **Bonhomie**
