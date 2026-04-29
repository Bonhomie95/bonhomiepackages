/**
 * @typedef {"string" | "number" | "boolean"} FieldType
 */

/**
 * @typedef {Object} FieldRule
 * @property {FieldType} type
 * @property {boolean} [required]
 * @property {number} [minLength]
 * @property {number} [maxLength]
 * @property {number} [min]
 * @property {number} [max]
 * @property {RegExp} [pattern]
 * @property {any[]} [enum]
 */

/**
 * @typedef {Object} SegmentRules
 * @property {Record<string, FieldRule>} [body]
 * @property {Record<string, FieldRule>} [query]
 * @property {Record<string, FieldRule>} [params]
 */

/**
 * @typedef {Object} ValidationError
 * @property {string} field
 * @property {string} message
 * @property {string} location
 */

/**
 * Validate one segment (body/query/params).
 * @param {any} data
 * @param {Record<string, FieldRule>} rules
 * @param {"body" | "query" | "params"} location
 * @returns {ValidationError[]}
 */
function validateSegment(data, rules, location) {
  const errors = [];

  for (const [field, rule] of Object.entries(rules)) {
    const value = data?.[field];
    const hasValue = value !== undefined && value !== null && value !== '';

    if (rule.required && !hasValue) {
      errors.push({
        field,
        location,
        message: 'Field is required',
      });
      continue;
    }

    if (!hasValue) continue;

    const actualType = typeof value;
    if (rule.type === 'number') {
      const numVal = Number(value);
      if (Number.isNaN(numVal)) {
        errors.push({
          field,
          location,
          message: 'Field must be a number',
        });
        continue;
      }

      if (rule.min !== undefined && numVal < rule.min) {
        errors.push({
          field,
          location,
          message: `Number must be >= ${rule.min}`,
        });
      }
      if (rule.max !== undefined && numVal > rule.max) {
        errors.push({
          field,
          location,
          message: `Number must be <= ${rule.max}`,
        });
      }
      continue;
    }

    if (rule.type === 'boolean') {
      const strVal = String(value).toLowerCase();
      if (
        !['true', 'false', '1', '0'].includes(strVal) &&
        actualType !== 'boolean'
      ) {
        errors.push({
          field,
          location,
          message: 'Field must be a boolean',
        });
      }
      continue;
    }

    if (rule.type === 'string') {
      const str = String(value);

      if (rule.minLength !== undefined && str.length < rule.minLength) {
        errors.push({
          field,
          location,
          message: `String length must be >= ${rule.minLength}`,
        });
      }
      if (rule.maxLength !== undefined && str.length > rule.maxLength) {
        errors.push({
          field,
          location,
          message: `String length must be <= ${rule.maxLength}`,
        });
      }
      if (rule.pattern && !rule.pattern.test(str)) {
        errors.push({
          field,
          location,
          message: 'Invalid format',
        });
      }
      if (rule.enum && !rule.enum.includes(str)) {
        errors.push({
          field,
          location,
          message: `Value must be one of: ${rule.enum.join(', ')}`,
        });
      }
    }
  }

  return errors;
}

/**
 * Express middleware factory: validate body/query/params using simple rules.
 *
 * @param {SegmentRules} schema
 * @returns {(req: any, res: any, next: any) => void}
 */
export function validateRequest(schema) {
  return function requestValidator(req, res, next) {
    /** @type {ValidationError[]} */
    let errors = [];

    if (schema.body) {
      errors = errors.concat(validateSegment(req.body, schema.body, 'body'));
    }
    if (schema.query) {
      errors = errors.concat(validateSegment(req.query, schema.query, 'query'));
    }
    if (schema.params) {
      errors = errors.concat(
        validateSegment(req.params, schema.params, 'params')
      );
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    next();
  };
}
