/**
 * @param {unknown} error
 * @param {string} code
 */
export function hasErrorCode(error, code) {
  return error instanceof Error && 'code' in error && error.code === code;
}

/** @param {unknown} error */
export function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
