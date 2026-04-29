import { ApiError } from './ApiError.js';

/**
 * Express error-handling middleware.
 *
 * Converts thrown errors to structured API responses.
 */
export function errorHandler(err, req, res, next) {
  // If response already sent, don't touch it
  if (res.headersSent) {
    return next(err);
  }

  // Handle known ApiError
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        statusCode: err.statusCode,
        details: err.details || undefined,
      },
    });
  }

  // Convert generic errors
  console.error('[api-shield] Unhandled Error:', err);

  const status = err.statusCode || 500;
  const message =
    status === 500
      ? 'Internal server error'
      : err.message || 'Unexpected error';

  return res.status(status).json({
    success: false,
    error: {
      message,
      statusCode: status,
    },
  });
}
