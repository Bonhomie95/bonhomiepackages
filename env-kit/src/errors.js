export class EnvError extends Error {
  /**
   * @param {string} message
   * @param {Array<{field: string, message: string}>} fields
   */
  constructor(message, fields = []) {
    super(message);
    this.name = 'EnvError';
    this.fields = fields;
  }
}
