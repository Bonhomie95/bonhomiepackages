const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate an email address.
 * @param {string} email
 * @returns {boolean}
 */
export function isEmail(email) {
  return EMAIL_REGEX.test(email);
}
