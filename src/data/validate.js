import { isPlainStateKey } from '../markup/data.js';
import { DATA_LIMITS } from './constants.js';

/**
 * @param {unknown} input
 * @param {string[]} required
 * @returns {asserts input is Record<string, unknown>}
 */
export function dataObject(input, required) {
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(input))
    || Object.keys(input).length !== required.length || required.some((key) => !Object.hasOwn(input, key))) {
    throw new Error('Invalid data object.');
  }
}

/**
 * @param {unknown} value
 * @param {number} [depth]
 * @returns {asserts value is import('../../types/json.js').JsonValue}
 */
export function jsonData(value, depth = 0) {
  if (depth > DATA_LIMITS.depth) { throw new Error('Data JSON is nested too deeply.'); }
  if (value === null || typeof value === 'boolean' || typeof value === 'string'
    || (typeof value === 'number' && Number.isFinite(value))) { return; }
  if (!value || typeof value !== 'object' || (!Array.isArray(value)
    && ![Object.prototype, null].includes(Object.getPrototypeOf(value)))) { throw new Error('Data must be plain JSON.'); }
  for (let item of Array.isArray(value) ? value : Object.values(value)) { jsonData(item, depth + 1); }
}

/**
 * @param {unknown} input
 * @returns {import('../../types/data.js').DataReference}
 */
export function validateDataReference(input) {
  dataObject(input, ['commitId', 'instanceId', 'markupRevision']);
  if (![input.commitId, input.instanceId].every((value) => typeof value === 'string' && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value))
    || !Number.isSafeInteger(input.markupRevision) || Number(input.markupRevision) < 0) { throw new Error('Invalid data reference.'); }
  return { commitId: /** @type {string} */ (input.commitId), instanceId: /** @type {string} */ (input.instanceId),
    markupRevision: /** @type {number} */ (input.markupRevision) };
}

/**
 * @param {unknown} input
 * @returns {import('../../types/data.js').DataCommit}
 */
export function validateDataCommit(input) {
  jsonData(input);
  dataObject(input, ['commitId', 'instanceId', 'markupRevision', 'baseRevision', 'changes']);
  let reference = validateDataReference({ commitId: input.commitId, instanceId: input.instanceId, markupRevision: input.markupRevision });
  if (typeof input.baseRevision !== 'string' || !/^[\da-f-]{36}$/i.test(input.baseRevision)
    || !Array.isArray(input.changes) || !input.changes.length || input.changes.length > DATA_LIMITS.targets) { throw new Error('Invalid data commit.'); }
  /** @type {import('../../types/data.js').DataChange[]} */
  let changes = [];
  for (let change of input.changes) {
    dataObject(change, ['provider', 'values']);
    if (typeof change.provider !== 'string' || !change.provider.trim() || change.provider.length > 128) { throw new Error('Invalid provider.'); }
    if (!change.values || typeof change.values !== 'object' || Array.isArray(change.values)) { throw new Error('Invalid values.'); }
    let keys = Object.keys(change.values);
    if (!keys.length || keys.length > DATA_LIMITS.keys || keys.some((key) => !isPlainStateKey(key))) { throw new Error('Invalid data keys.'); }
    changes.push({ provider: change.provider,
      values: /** @type {import('../../types/data.js').DataChange['values']} */ (change.values) });
  }
  if (new Set(changes.map((change) => change.provider)).size !== changes.length
    || new TextEncoder().encode(JSON.stringify({ type: 'data-commit', commit: input })).byteLength > DATA_LIMITS.bytes) { throw new Error('Data commit exceeds limits.'); }
  return structuredClone({ ...reference, baseRevision: input.baseRevision, changes });
}
