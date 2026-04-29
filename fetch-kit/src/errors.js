export class FetchError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, statusText?: string, body?: any, url?: string, method?: string }} [meta]
   */
  constructor(message, meta = {}) {
    super(message);
    this.name = 'FetchError';
    this.status = meta.status ?? null;
    this.statusText = meta.statusText ?? null;
    this.body = meta.body ?? null;
    this.url = meta.url ?? null;
    this.method = meta.method ?? null;
  }

  isClientError() {
    return this.status !== null && this.status >= 400 && this.status < 500;
  }

  isServerError() {
    return this.status !== null && this.status >= 500;
  }

  isNetworkError() {
    return this.status === null;
  }

  isUnauthorized() {
    return this.status === 401;
  }

  isForbidden() {
    return this.status === 403;
  }

  isNotFound() {
    return this.status === 404;
  }
}

export class TimeoutError extends FetchError {
  constructor(url, timeoutMs) {
    super(`Request timed out after ${timeoutMs}ms`, { url });
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}
