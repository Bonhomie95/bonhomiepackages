import { coerce } from './types.js';
import { EnvError } from './errors.js';

/**
 * @typedef {'string'|'number'|'integer'|'boolean'|'port'|'url'|'email'|'json'} FieldType
 *
 * @typedef {Object} FieldSchema
 * @property {FieldType}  [type='string']
 * @property {boolean}   [required=true]   Set false to make optional. Ignored when default is set.
 * @property {any}       [default]         Returned when the variable is missing.
 * @property {any[]}     [enum]            Allowed values (after coercion).
 * @property {number}    [min]             Minimum value (number/integer/port).
 * @property {number}    [max]             Maximum value (number/integer/port).
 * @property {number}    [minLength]       Minimum string length.
 * @property {number}    [maxLength]       Maximum string length.
 * @property {(value: any) => true | string} [validate]  Custom validator.
 * @property {string}    [description]     Human-readable description (shown in errors).
 */

/**
 * Validate and coerce a single field.
 * @returns {{ ok: true, value: any } | { ok: false, errors: Array<{field,message}> }}
 */
function validateField(key, rawValue, schema) {
  const fieldErrors = [];

  // Treat whitespace-only strings as missing — `Number('   ')` is 0 in JS,
  // which would silently accept a blank env var as a valid number.
  const isMissing =
    rawValue === undefined ||
    rawValue === null ||
    String(rawValue).trim() === '';

  if (isMissing) {
    if ('default' in schema) return { ok: true, value: schema.default };
    if (schema.required === false) return { ok: true, value: undefined };
    fieldErrors.push({ field: key, message: 'is required but was not provided' });
    return { ok: false, errors: fieldErrors };
  }

  // Type coercion
  const type = schema.type ?? 'string';
  const coercer = coerce[type];
  if (!coercer) {
    fieldErrors.push({ field: key, message: `unknown type "${type}"` });
    return { ok: false, errors: fieldErrors };
  }

  const coerced = coercer(rawValue);
  if (!coerced.ok) {
    fieldErrors.push({ field: key, message: coerced.error });
    return { ok: false, errors: fieldErrors };
  }

  const value = coerced.value;

  // Enum check
  if (schema.enum !== undefined) {
    if (!schema.enum.includes(value)) {
      fieldErrors.push({
        field: key,
        message: `must be one of: ${schema.enum.map((v) => JSON.stringify(v)).join(', ')}`,
      });
      return { ok: false, errors: fieldErrors };
    }
  }

  // Numeric range
  if (typeof value === 'number') {
    if (schema.min !== undefined && value < schema.min)
      fieldErrors.push({ field: key, message: `must be >= ${schema.min}` });
    if (schema.max !== undefined && value > schema.max)
      fieldErrors.push({ field: key, message: `must be <= ${schema.max}` });
  }

  // String length
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength)
      fieldErrors.push({ field: key, message: `must be at least ${schema.minLength} characters` });
    if (schema.maxLength !== undefined && value.length > schema.maxLength)
      fieldErrors.push({ field: key, message: `must be at most ${schema.maxLength} characters` });
  }

  if (fieldErrors.length) return { ok: false, errors: fieldErrors };

  // Custom validator
  if (schema.validate) {
    const result = schema.validate(value);
    if (result !== true) {
      fieldErrors.push({
        field: key,
        message: typeof result === 'string' ? result : 'failed custom validation',
      });
      return { ok: false, errors: fieldErrors };
    }
  }

  return { ok: true, value };
}

/**
 * Validate and parse environment variables against a schema.
 * Collects ALL errors before throwing — not just the first one.
 *
 * @template {Record<string, FieldSchema>} S
 * @param {S} schema
 * @param {Record<string, string | undefined>} [source]  Defaults to process.env.
 * @returns {Readonly<Record<keyof S, any>>}
 */
export function createEnv(schema, source) {
  const env = source ?? (typeof process !== 'undefined' ? process.env : {});

  const result = {};
  const allErrors = [];

  for (const [key, fieldSchema] of Object.entries(schema)) {
    const validation = validateField(key, env[key], fieldSchema);
    if (!validation.ok) {
      allErrors.push(...validation.errors);
    } else {
      result[key] = validation.value;
    }
  }

  if (allErrors.length > 0) {
    const message = [
      `\nEnvironment validation failed — ${allErrors.length} error${allErrors.length > 1 ? 's' : ''}:\n`,
      ...allErrors.map(
        (e) => `  ✗  ${e.field}${e.field ? ': ' : ''}${e.message}`
      ),
      '',
    ].join('\n');
    throw new EnvError(message, allErrors);
  }

  return Object.freeze(result);
}
