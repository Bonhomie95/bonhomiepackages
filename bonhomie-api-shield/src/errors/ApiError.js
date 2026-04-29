/**
 * A structured error class for clean API responses.
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {any} [details] - Extra metadata (optional)
   */
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;

    // Remove stack in production for security
    if (process.env.NODE_ENV === "production") {
      this.stack = undefined;
    }
  }

  /**
   * Convenience helper to convert to JSON
   */
  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        statusCode: this.statusCode,
        details: this.details || undefined
      }
    };
  }
}
