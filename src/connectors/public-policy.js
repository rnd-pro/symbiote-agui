import { object, keys, text } from '../feedback/validate-shape.js';
import { CONNECTOR_ACTION, CONNECTOR_PUBLIC_LIMITS, CONNECTOR_REVISION, CONNECTOR_UUID } from './constants.js';
import { CommandError } from '../shared/command-error.js';

/** @param {unknown} value */
function resources(value) {
  object(value);
  if (!Object.keys(value).length || Object.keys(value).length > CONNECTOR_PUBLIC_LIMITS.resources || Object.entries(value).some(([
    key,
    entry,
  ]) => !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key) || [
    '__proto__',
    'constructor',
    'prototype',
  ].includes(key) || !(entry === null || typeof entry === 'boolean' || typeof entry === 'string' && entry.length <= CONNECTOR_PUBLIC_LIMITS.scalarLength
    || typeof entry === 'number' && Number.isFinite(entry)))) {
    throw new CommandError('Public access requires 1-16 fixed resource fields with bounded scalar values.');
  }
}

/** @param {unknown} value */
function origin(value) {
  text(value, 256);
  let url = new URL(value);
  if (url.origin !== value || url.protocol !== 'https:' || url.username || url.password) {
    throw new CommandError('Public access requires an exact HTTPS origin.');
  }
}

/**
 * @param {unknown} value
 * @returns {import('../../types/connectors.js').ConnectorExposureOptions}
 */
export function validateExposureOptions(value) {
  object(value);
  keys(value, [
    'revision',
    'actor',
    'origin',
    'resources',
    'expiresInSeconds',
    'requestsPerMinute',
  ], [
    'profile',
    'timeoutMs',
    'resultBytes',
  ]);
  validateCommon(value);
  if (!Number.isSafeInteger(value.expiresInSeconds) || Number(value.expiresInSeconds) < 1 || Number(value.expiresInSeconds) > CONNECTOR_PUBLIC_LIMITS.expirySeconds) {
    throw new CommandError('Public capabilities must expire within 1-86400 seconds.');
  }
  if ('profile' in value) { text(value.profile, 64); }
  for (let key of [
    'timeoutMs',
    'resultBytes',
  ]) { if (key in value && (!Number.isSafeInteger(value[key]) || Number(value[key]) < 1)) { throw new CommandError('Invalid execution limit.'); } }
  return /** @type {import('../../types/connectors.js').ConnectorExposureOptions} */ (/** @type {unknown} */ (value));
}

/** @param {Record<string, unknown>} value */
function validateCommon(value) {
  if (typeof value.actor !== 'string' || !CONNECTOR_ACTION.test(value.actor)
    || typeof value.revision !== 'string' || !CONNECTOR_REVISION.test(value.revision)
    || !Number.isSafeInteger(value.requestsPerMinute) || Number(value.requestsPerMinute) < 1 || Number(value.requestsPerMinute) > CONNECTOR_PUBLIC_LIMITS.requestsPerMinute) {
    throw new CommandError('Public access requires an actor key, reviewed revision, and 1-120 requests per minute.');
  }
  origin(value.origin);
  resources(value.resources);
}

/**
 * @param {unknown} value
 * @returns {asserts value is import('../../types/connectors.js').ConnectorExposure[]}
 */
export function validateExposures(value) {
  if (!Array.isArray(value) || value.length > CONNECTOR_PUBLIC_LIMITS.capabilities) { throw new CommandError('Invalid public connector capabilities.'); }
  let ids = new Set();
  for (let entry of value) {
    object(entry);
    keys(entry, [
      'id',
      'action',
      'actor',
      'origin',
      'revision',
      'resources',
      'expiresAt',
      'requestsPerMinute',
      'tokenHash',
    ]);
    validateCommon(entry);
    if (typeof entry.id !== 'string' || !CONNECTOR_UUID.test(entry.id) || ids.has(entry.id)
      || typeof entry.action !== 'string' || !CONNECTOR_ACTION.test(entry.action)
      || !Number.isSafeInteger(entry.expiresAt) || Number(entry.expiresAt) < 1
      || typeof entry.tokenHash !== 'string' || !/^[a-f0-9]{64}$/.test(entry.tokenHash)) {
      throw new CommandError('Invalid public connector capability.');
    }
    ids.add(entry.id);
  }
}
