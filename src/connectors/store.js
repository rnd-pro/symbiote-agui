import { randomUUID, createHash } from 'node:crypto';
import { join } from 'node:path';
import { definitionPaths } from '../library/paths.js';
import { getStateRoot } from '../sessions/store.js';
import { sessionKey } from '../sessions/identity.js';
import { prepareTextFile, readOptional } from '../library/files.js';
import { CommandError } from '../shared/command-error.js';
import { CONNECTOR_LIMITS, CONNECTOR_UUID } from './constants.js';
import { emptyConnectors, validateConnectorPolicy } from './validate.js';
import { validateExposures } from './public-policy.js';

/**
 * @param {string} sessionId
 * @param {string} [root]
 */
export function connectorPrivatePath(sessionId, root = getStateRoot()) {
  return join(root, '.connectors', `${sessionKey(sessionId)}.json`);
}

/** @param {string} sessionId */
export async function readConnectorSnapshot(sessionId) {
  let raw = await readOptional(definitionPaths(sessionId).connectorPath, CONNECTOR_LIMITS.policyBytes);
  return {
    raw,
    policy: validateConnectorPolicy(raw === undefined ? emptyConnectors() : JSON.parse(raw)),
  };
}

/**
 * @param {string} sessionId
 * @param {string} [root]
 * @returns {Promise<import('../../types/connectors.js').ConnectorPrivate>}
 */
export async function readConnectorPrivate(sessionId, root = getStateRoot()) {
  let raw = await readOptional(connectorPrivatePath(sessionId, root), CONNECTOR_LIMITS.privateBytes);
  if (raw === undefined) { return {
    version: 1,
    epoch: randomUUID(),
    routes: {},
    accepted: {},
    exposures: [],
  }; }
  let value = /** @type {import('../../types/connectors.js').ConnectorPrivate} */ (JSON.parse(raw));
  if (!value || typeof value !== 'object' || Array.isArray(value)) { throw new CommandError('Invalid private connector settings.'); }
  value.accepted ??= {};
  if (!value || value.version !== 1 || !CONNECTOR_UUID.test(value.epoch) || !value.routes || typeof value.routes !== 'object'
    || Array.isArray(value.routes) || Object.keys(value).some((key) => ![
      'version',
      'epoch',
      'routes',
      'accepted',
      'exposures',
    ].includes(key)) || Object.entries(value.routes).some(([
      id,
      root,
    ]) => !CONNECTOR_UUID.test(id) || typeof root !== 'string' || !root)) {
    throw new CommandError('Invalid private connector settings.');
  }
  if (!value.accepted || typeof value.accepted !== 'object' || Array.isArray(value.accepted)
    || Object.entries(value.accepted).some(([
      name,
      digest,
    ]) => !/^[a-z][a-z0-9_-]{0,63}$/.test(name) || typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest))) {
    throw new CommandError('Invalid accepted connector requirements.');
  }
  value.exposures ??= [];
  validateExposures(value.exposures);
  return value;
}

/** @param {import('../../types/connectors.js').ConnectorPolicy} policy */
export function connectorFingerprints(policy) {
  return Object.fromEntries(policy.actions.map((entry) => [
    entry.name,
    createHash('sha256').update(JSON.stringify([
      entry.registryId,
      entry.scriptId,
      entry.revision,
      entry.effect,
    ])).digest('hex'),
  ]));
}

/**
 * @param {string} path
 * @param {unknown} value
 * @param {number} limit
 */
async function save(path, value, limit) {
  let before = await readOptional(path, limit);
  let raw = `${JSON.stringify(value, null, 2)}\n`;
  if (Buffer.byteLength(raw) > limit) { throw new CommandError('Connector settings exceed their size limit.'); }
  let pending = await prepareTextFile(path, raw, {
    text: before,
    maxBytes: limit,
  });
  try { await pending.commit(); }
  finally { await pending.discard(); }
}

/**
 * @param {string} sessionId
 * @param {import('../../types/connectors.js').ConnectorPrivate} value
 */
export function saveConnectorPrivate(sessionId, value) {
  return save(connectorPrivatePath(sessionId), value, CONNECTOR_LIMITS.privateBytes);
}

/**
 * @param {string} sessionId
 * @param {import('../../types/connectors.js').ConnectorPolicy} value
 */
export function saveConnectorPolicy(sessionId, value) {
  return save(definitionPaths(sessionId).connectorPath, validateConnectorPolicy(value), CONNECTOR_LIMITS.policyBytes);
}

/**
 * @param {string} sessionId
 * @param {import('../../types/connectors.js').ConnectorPrivate} settings
 * @param {string} action
 * @param {string} [root]
 */
export function connectorScope(sessionId, settings, action, root = getStateRoot()) {
  return `agui:${createHash('sha256').update(JSON.stringify([
    root,
    sessionId,
    settings.epoch,
    action,
  ])).digest('hex')}`;
}

/**
 * @param {string} sessionId
 * @param {import('../../types/connectors.js').ConnectorPrivate} settings
 * @param {import('../../types/connectors.js').ConnectorExposure} exposure
 * @param {string} [root]
 */
export function publicConnectorScope(sessionId, settings, exposure, root) {
  return `agui-public:${createHash('sha256').update(JSON.stringify([
    connectorScope(sessionId, settings, exposure.action, root),
    exposure.id,
  ])).digest('hex')}`;
}
