import { validateExposureOptions } from './public-policy.js';
import { CommandError } from '../shared/command-error.js';
import { object, keys } from '../feedback/validate-shape.js';
import { CONNECTOR_ACTION, CONNECTOR_LIMITS, CONNECTOR_REVISION, CONNECTOR_UUID } from './constants.js';

/** @returns {import('../../types/connectors.js').ConnectorPolicy} */
export function emptyConnectors() {
  return {
    version: 1,
    actions: [],
  };
}

/**
 * @param {unknown} value
 * @returns {import('../../types/connectors.js').ConnectorPolicy}
 */
export function validateConnectorPolicy(value) {
  object(value);
  keys(value, [
    'version',
    'actions',
  ]);
  if (value.version !== 1 || !Array.isArray(value.actions) || value.actions.length > CONNECTOR_LIMITS.actions) {
    throw new CommandError('Expected connector policy version 1 and a bounded actions array.');
  }
  let names = new Set();
  for (let entry of value.actions) {
    object(entry);
    keys(entry, [
      'name',
      'registryId',
      'address',
      'scriptId',
      'revision',
      'effect',
    ]);
    if (typeof entry.name !== 'string' || !CONNECTOR_ACTION.test(entry.name) || names.has(entry.name)
      || typeof entry.registryId !== 'string' || !CONNECTOR_UUID.test(entry.registryId)
      || typeof entry.scriptId !== 'string' || !CONNECTOR_UUID.test(entry.scriptId)
      || typeof entry.revision !== 'string' || !CONNECTOR_REVISION.test(entry.revision)
      || typeof entry.address !== 'string' || entry.address.length > 256
      || !/^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)*$/.test(entry.address)
      || ![
        'read',
        'write',
      ].includes(String(entry.effect))) { throw new CommandError('Invalid or duplicate connector requirement.'); }
    names.add(entry.name);
  }
  if (Buffer.byteLength(JSON.stringify(value)) > CONNECTOR_LIMITS.policyBytes) { throw new CommandError('Connector policy is too large.'); }
  return /** @type {import('../../types/connectors.js').ConnectorPolicy} */ (/** @type {unknown} */ (value));
}

/**
 * @param {unknown} value
 * @param {boolean} call
 * @returns {import('../../types/connectors.js').ConnectorCall}
 */
export function validateConnectorReference(value, call) {
  object(value);
  keys(value, call ? [
    'action',
    'requestId',
    'instanceId',
    'revision',
    'markupRevision',
    'input',
  ] : [
    'action',
    'requestId',
    'instanceId',
  ]);
  if (typeof value.action !== 'string' || !CONNECTOR_ACTION.test(value.action)
    || typeof value.requestId !== 'string' || !CONNECTOR_UUID.test(value.requestId)
    || typeof value.instanceId !== 'string' || !CONNECTOR_UUID.test(value.instanceId)
    || call && (typeof value.revision !== 'string' || !CONNECTOR_REVISION.test(value.revision)
      || !Number.isSafeInteger(value.markupRevision) || Number(value.markupRevision) < 0)) {
    throw new CommandError('Invalid connector request reference.');
  }
  return /** @type {import('../../types/connectors.js').ConnectorCall} */ (/** @type {unknown} */ (value));
}

/**
 * @param {unknown} value
 * @returns {import('../../types/connectors.js').ConnectorChange}
 */
export function validateConnectorChange(value) {
  object(value);
  let rules = {
    attach: [
      'command',
      'action',
      'registry',
      'address',
      'cwd',
    ],
    update: [
      'command',
      'action',
    ],
    detach: [
      'command',
      'action',
    ],
    review: [
      'command',
      'action',
    ],
    describe: [
      'command',
      'action',
    ],
    grant: [
      'command',
      'action',
      'revision',
      'source',
    ],
    expose: [
      'command',
      'action',
      'policy',
    ],
    unexpose: [
      'command',
      'action',
    ],
    revoke: [
      'command',
      'action',
    ],
    status: [
      'command',
    ],
    list: [
      'command',
    ],
  };
  if (typeof value.command !== 'string' || !Object.hasOwn(rules, value.command)) { throw new CommandError('Invalid connector operation.'); }
  keys(value, rules[/** @type {keyof typeof rules} */ (value.command)], value.command === 'update' ? [
    'registry',
    'cwd',
  ] : value.command === 'review' ? [
    'path',
  ] : value.command === 'grant' ? [
    'profile',
    'timeoutMs',
    'resultBytes',
  ] : []);
  if ('action' in value && (typeof value.action !== 'string' || !CONNECTOR_ACTION.test(value.action))) { throw new CommandError('Invalid connector action key.'); }
  for (let key of [
    'registry',
    'address',
    'cwd',
    'profile',
  ]) {
    if (key in value && (typeof value[key] !== 'string' || !value[key] || value[key].length > 4096 || value[key].includes('\0'))) {
      throw new CommandError('Connector references must be bounded strings.');
    }
  }
  if (value.command === 'expose') { value.policy = validateExposureOptions(value.policy); }
  if (value.command === 'grant' && (typeof value.revision !== 'string' || !CONNECTOR_REVISION.test(value.revision)
    || ![
      'agent',
      'agui',
    ].includes(String(value.source)))) { throw new CommandError('Grant requires an exact revision and agent/agui source.'); }
  for (let key of [
    'timeoutMs',
    'resultBytes',
  ]) { if (key in value && (!Number.isSafeInteger(value[key]) || Number(value[key]) < 1)) { throw new CommandError('Invalid connector execution limit.'); } }
  return /** @type {import('../../types/connectors.js').ConnectorChange} */ (/** @type {unknown} */ (value));
}
