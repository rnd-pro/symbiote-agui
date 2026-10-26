/** @param {unknown} value */
export function validProjectId(value) {
  return typeof value === 'string' && /^(?:default|[a-f0-9]{64})$/.test(value);
}
