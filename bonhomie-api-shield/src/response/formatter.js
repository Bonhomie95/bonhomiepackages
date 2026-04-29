/**
 * Standard success response
 *
 * @param {any} data
 * @param {any} [meta]
 */
export function success(data, meta = null) {
  return {
    success: true,
    data,
    meta: meta || undefined,
  };
}

/**
 * Standard fail response
 *
 * @param {string} message
 * @param {number} [statusCode=400]
 */
export function fail(message, statusCode = 400) {
  return {
    success: false,
    error: {
      message,
      statusCode,
    },
  };
}

/**
 * Paginated response formatter
 *
 * @param {any[]} items
 * @param {{ page: number; perPage: number; total: number }} meta
 */
export function paginate(items, meta) {
  return {
    success: true,
    data: items,
    pagination: {
      page: meta.page,
      perPage: meta.perPage,
      total: meta.total,
      totalPages: Math.ceil(meta.total / meta.perPage),
    },
  };
}

/**
 * Optional Express middleware:
 * Adds res.success, res.fail, res.paginate
 */
export function responseFormatter() {
  return (req, res, next) => {
    res.success = (data, meta) => res.json(success(data, meta));

    res.fail = (message, statusCode = 400) =>
      res.status(statusCode).json(fail(message, statusCode));

    res.paginate = (items, meta) => res.json(paginate(items, meta));

    next();
  };
}
