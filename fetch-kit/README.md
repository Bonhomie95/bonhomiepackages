# @bonhomie/fetch-kit

Smart fetch wrapper for React and Node. Drop-in `axios` alternative — smaller, modern, and built around native `fetch`.

![npm](https://img.shields.io/npm/v/@bonhomie/fetch-kit)
![license](https://img.shields.io/npm/l/@bonhomie/fetch-kit)
![zero deps](https://img.shields.io/badge/dependencies-0-brightgreen)

---

## Why not axios?

- **axios** is 400KB+, wraps XMLHttpRequest, and has an outdated API.
- **fetch-kit** wraps native `fetch`, works in browsers and Node 18+, and covers everything you actually need from axios.

---

## 📦 Installation

```bash
npm install @bonhomie/fetch-kit
```

Requires native `fetch` — built into browsers and Node 18+. No polyfill needed.

---

## Quick Start

```js
import { createFetchKit } from "@bonhomie/fetch-kit";

const api = createFetchKit({
  baseUrl: "https://api.yourapp.com",
  getToken: () => localStorage.getItem("token"),
  onTokenExpired: async () => {
    const { token } = await refreshToken();
    localStorage.setItem("token", token);
    return token;
  },
  retries: 2,
  timeout: 8000,
});

const users = await api.get("/users");
const user  = await api.post("/users", { name: "Alice" });
await       api.put("/users/1", { name: "Bob" });
await       api.patch("/users/1", { active: false });
await       api.delete("/users/1");
```

---

## Configuration

| Option           | Type                        | Default           | Description                                                    |
| ---------------- | --------------------------- | ----------------- | -------------------------------------------------------------- |
| `baseUrl`        | `string`                    | `""`              | Prepended to all paths.                                        |
| `headers`        | `Record<string, string>`    | `{}`              | Default headers sent with every request.                       |
| `getToken`       | `() => string\|null`        | —                 | Returns the current auth token. Injected as `Bearer`.          |
| `onTokenExpired` | `() => Promise<string>`     | —                 | Called on 401. Should refresh and return the new token.        |
| `retries`        | `number`                    | `0`               | How many times to retry on server errors or network failures.  |
| `retryDelay`     | `number` (ms)               | `300`             | Base delay between retries. Doubles on each attempt (backoff). |
| `retryOn`        | `number[]`                  | `[500,502,503,504]` | HTTP statuses that trigger a retry.                          |
| `timeout`        | `number` (ms)               | —                 | Throws `TimeoutError` if the request exceeds this.             |
| `onRequest`      | `(config) => config`        | —                 | Interceptor run before each request.                           |
| `onResponse`     | `({ status, data, headers }) => any` | —      | Interceptor run after each successful parse.                   |
| `onError`        | `(err: FetchError) => void` | —                 | Called for every error before it's thrown.                     |

---

## Methods

```js
api.get(path, options?)                 // GET
api.post(path, body?, options?)         // POST
api.put(path, body?, options?)          // PUT
api.patch(path, body?, options?)        // PATCH
api.delete(path, options?)              // DELETE
api.request(method, path, options?)     // custom method
```

### Options per request

```js
api.get("/users", {
  query:   { page: 1, limit: 20 },        // appended as ?page=1&limit=20
  headers: { "X-Request-ID": "abc" },     // merged with default headers
  signal:  controller.signal,             // AbortController support
});
```

---

## Token Refresh (401 flow)

When a request gets a 401:
1. `onTokenExpired()` is called once.
2. The request is retried with the new token.
3. If the retry also gets 401, a `FetchError(401)` is thrown — no infinite loop.

```js
const api = createFetchKit({
  baseUrl: "https://api.example.com",
  getToken: () => store.getState().token,
  onTokenExpired: async () => {
    const res = await fetch("/auth/refresh", { method: "POST" });
    const { token } = await res.json();
    store.dispatch(setToken(token));
    return token;
  },
});
```

---

## Retry with Backoff

```js
const api = createFetchKit({
  baseUrl: "https://api.example.com",
  retries: 3,          // up to 3 retries
  retryDelay: 500,     // 500ms → 1000ms → 2000ms (exponential)
  retryOn: [500, 502, 503, 504],
});
```

Retries also trigger on network errors (e.g. DNS failure, connection refused). 4xx errors are **not** retried (except 401 with `onTokenExpired`).

---

## Timeout + Abort

```js
// Timeout
const api = createFetchKit({ baseUrl: "...", timeout: 5000 });

// Per-request abort
const controller = new AbortController();
setTimeout(() => controller.abort(), 3000);
const data = await api.get("/stream", { signal: controller.signal });
```

---

## Interceptors

```js
const api = createFetchKit({
  baseUrl: "https://api.example.com",

  // Modify the request before it's sent
  onRequest: (config) => ({
    ...config,
    headers: { ...config.headers, "X-Request-ID": crypto.randomUUID() },
  }),

  // Transform the response data
  onResponse: ({ data }) => data.result ?? data,

  // Log every error
  onError: (err) => logger.error({ status: err.status, url: err.url }),
});
```

---

## Error Handling

```js
import { FetchError, TimeoutError } from "@bonhomie/fetch-kit";

try {
  const data = await api.get("/users");
} catch (err) {
  if (err instanceof TimeoutError) {
    console.log("Request timed out");
  } else if (err instanceof FetchError) {
    console.log(err.status);       // 404, 500, null (network)
    console.log(err.body);         // parsed response body
    console.log(err.url);          // URL that failed
    console.log(err.method);       // "GET", "POST", etc.

    if (err.isUnauthorized())  { /* 401 */ }
    if (err.isForbidden())     { /* 403 */ }
    if (err.isNotFound())      { /* 404 */ }
    if (err.isClientError())   { /* 4xx */ }
    if (err.isServerError())   { /* 5xx */ }
    if (err.isNetworkError())  { /* no response */ }
  }
}
```

---

## Security Notes

- **Header injection** — all header values are stripped of `\r`, `\n`, and null bytes before the request is sent. An attacker who can influence header values cannot inject additional HTTP headers.
- **Auth tokens** — tokens are never included in error messages.
- **Non-serializable bodies** — `JSON.stringify` failures are caught and thrown as `FetchError` instead of crashing with an unhandled exception.

---

## 📄 License

MIT — **Bonhomie**
