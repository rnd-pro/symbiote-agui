import { ERROR_CODE, EXIT_CODE } from './constants.js';

export class CommandError extends Error {
  /**
   * @param {string} message
   * @param {import('../../types/cli.js').ErrorCode} code
   * @param {import('../../types/cli.js').ExitCode} exitCode
   */
  constructor(message, code = ERROR_CODE.INVALID_INPUT, exitCode = EXIT_CODE.INVALID_INPUT) {
    super(message);
    this.name = 'CommandError';
    this.code = code;
    this.exitCode = exitCode;
  }
}
