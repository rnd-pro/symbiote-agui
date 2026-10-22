import { DATA_LIMITS } from '../../../../../data/constants.js';
import { dataObject, jsonData, validateDataChanges } from '../../../../../data/validate.js';
import { RESERVED_PROVIDER_NAMES } from '../../../../../markup/constants.js';
import { TRANSFER_VERSION, transferError } from './constants.js';

/**
 * @param {unknown} input
 * @param {import('../../../../../../types/data.js').DataTarget[]} targets
 * @returns {import('../../../../../../types/data.js').DataTransferDocument}
 */
export function transferDocument(input, targets) {
  try {
    jsonData(input);
    dataObject(input, ['version', 'changes']);
    if (input.version !== TRANSFER_VERSION) { throw new Error(); }
    let changes = validateDataChanges(input.changes);
    if (!targets.length || changes.length !== targets.length || new Set(targets.map((target) => target.provider)).size !== targets.length
      || targets.some((target) => {
        let change = changes.find((change) => change.provider === target.provider);
        return RESERVED_PROVIDER_NAMES.includes(target.provider) || !change || !target.keys.length
          || new Set(target.keys).size !== target.keys.length || target.keys.length !== Object.keys(change.values).length
          || target.keys.some((key) => !Object.hasOwn(change.values, key));
      })) { throw transferError('INVALID_TARGET'); }
    return { version: TRANSFER_VERSION, changes };
  } catch (error) {
    if (error instanceof Error && 'code' in error) { throw error; }
    throw transferError('INVALID_JSON');
  }
}

/**
 * @param {string} text
 * @param {import('../../../../../../types/data.js').DataTarget[]} targets
 */
export function parseTransfer(text, targets) {
  if (new TextEncoder().encode(text).byteLength > DATA_LIMITS.bytes) { throw transferError('TOO_LARGE'); }
  let input;
  try { input = JSON.parse(text.replace(/^\uFEFF/, '')); }
  catch { throw transferError('INVALID_JSON'); }
  return transferDocument(input, targets);
}

/**
 * @param {import('../../../../../../types/data.js').DataChange[]} changes
 * @param {import('../../../../../../types/data.js').DataTarget[]} targets
 */
export function serializeTransfer(changes, targets) {
  let text = JSON.stringify(transferDocument({ version: TRANSFER_VERSION, changes }, targets)) + '\n';
  if (new TextEncoder().encode(text).byteLength > DATA_LIMITS.bytes) { throw transferError('TOO_LARGE'); }
  return text;
}
