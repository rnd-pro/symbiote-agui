import { DIAGRAM_LIMITS } from './constants.js';

/** @param {unknown} value */
export function diagramSourceIssue(value) {
  if (typeof value !== 'string') { return 'invalidValue'; }
  if (value.length > DIAGRAM_LIMITS.inputBytes || new TextEncoder().encode(value).byteLength > DIAGRAM_LIMITS.inputBytes) {
    return 'inputTooLarge';
  }
  return value.trim() ? '' : 'empty';
}
