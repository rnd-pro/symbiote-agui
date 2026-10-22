import { CommandError } from '../shared/command-error.js';
import { isPlainStateKey } from '../markup/data.js';
import { DATA_ENDPOINT_KIND, METADATA_KEYS, METADATA_LIMITS } from './constants.js';

/**
 * @param {unknown} input
 * @param {string[]} required
 * @param {string[]} [optional]
 * @returns {asserts input is Record<string, unknown>}
 */
function object(input, required, optional = []) {
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(input))
    || required.some((key) => !Object.hasOwn(input, key))
    || Object.keys(input).some((key) => !required.includes(key) && !optional.includes(key))) {
    throw new CommandError('Metadata has missing or unsupported fields.');
  }
}

/**
 * @param {unknown} value
 * @param {number} [limit]
 * @returns {string}
 */
function text(value, limit = METADATA_LIMITS.text) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new CommandError('Metadata requires nonempty, bounded text without control characters.');
  }
  return value.trim();
}

/**
 * @param {unknown} input
 * @returns {import('../../types/metadata.js').DataEndpoint}
 */
function endpoint(input) {
  object(input, ['kind', 'description'], ['reference']);
  if (!Object.values(DATA_ENDPOINT_KIND).some((kind) => kind === input.kind)) {
    throw new CommandError(`Metadata endpoint kind must be one of: ${Object.values(DATA_ENDPOINT_KIND).join(', ')}.`);
  }
  let reference = input.reference === undefined ? undefined : text(input.reference);
  if (reference && /^[a-z][a-z\d+.-]*:\/\//i.test(reference)) {
    let url;
    try { url = new URL(reference); }
    catch { throw new CommandError('Metadata references must be resource names or valid non-secret URLs.'); }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new CommandError('Metadata URLs must use HTTP(S), without credentials, query strings, or fragments.');
    }
  }
  return { kind: /** @type {import('../../types/metadata.js').DataEndpoint['kind']} */ (input.kind),
    description: text(input.description), ...(reference === undefined ? {} : { reference }) };
}

/**
 * @param {unknown} input
 * @returns {import('../../types/metadata.js').DataBinding}
 */
function binding(input) {
  object(input, ['provider', 'keys']);
  if (!Array.isArray(input.keys) || !input.keys.length || input.keys.length > METADATA_LIMITS.keys
    || input.keys.some((key) => !isPlainStateKey(key) || key.length > 128)
    || new Set(input.keys).size !== input.keys.length) {
    throw new CommandError('Metadata bindings require unique plain state keys.');
  }
  return { provider: text(input.provider, 128), keys: [...input.keys] };
}

/**
 * @param {unknown} input
 * @returns {import('../../types/metadata.js').SessionMetadata}
 */
export function validateMetadata(input) {
  object(input, [], [...METADATA_KEYS]);
  if (!Object.hasOwn(input, 'dataFlow')) { return {}; }
  let flow = input.dataFlow;
  object(flow, ['description', 'initialSource', 'bindings', 'targets']);
  if (!Array.isArray(flow.targets) || !flow.targets.length || flow.targets.length > METADATA_LIMITS.endpoints
    || !Array.isArray(flow.bindings) || !flow.bindings.length || flow.bindings.length > METADATA_LIMITS.bindings) {
    throw new CommandError('Data flow requires bounded, nonempty bindings and targets arrays.');
  }
  let bindings = flow.bindings.map(binding);
  if (new Set(bindings.map((item) => item.provider)).size !== bindings.length) {
    throw new CommandError('Use one binding per provider, with its property keys.');
  }
  let metadata = { dataFlow: { description: text(flow.description), initialSource: endpoint(flow.initialSource),
    bindings, targets: flow.targets.map(endpoint) } };
  if (Buffer.byteLength(JSON.stringify(metadata)) + 1 > METADATA_LIMITS.bytes) {
    throw new CommandError('Metadata exceeds 16 KiB.');
  }
  return metadata;
}
