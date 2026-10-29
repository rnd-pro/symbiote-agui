import { CommandError } from '../shared/command-error.js';
import { PROXY_LIMITS, PROXY_PATH } from './constants.js';

/** @returns {import('../../types/proxy.js').ProxyPolicy} */
export function emptyProxyPolicy() {
  return {
    version: 1,
    allowedOrigins: [],
  };
}

/** @param {unknown} value */
export function normalizeProxyOrigin(value) {
  try {
    if (typeof value !== 'string' || !value || value.length > PROXY_LIMITS.originLength
      || !/^https?:\/\/[^/?#]+\/?$/i.test(value) || /[\s\\*\x00-\x1f\x7f]/.test(value)) { throw new Error(); }
    let url = new URL(value);
    if (![
      'http:',
      'https:',
    ].includes(url.protocol) || url.username || url.password || url.port
      || url.pathname !== '/' || url.search || url.hash || url.origin.length > PROXY_LIMITS.originLength) { throw new Error(); }
    return url.origin;
  } catch { throw new CommandError('Proxy sources must be HTTP(S) origins on their default ports, without credentials, paths, queries, fragments, or wildcards.'); }
}

/**
 * @param {unknown} input
 * @returns {import('../../types/proxy.js').ProxyPolicy}
 */
export function validateProxyPolicy(input) {
  let value = /** @type {Partial<import('../../types/proxy.js').ProxyPolicy> | null} */ (input);
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1
    || Object.keys(value).some((key) => ![
      'version',
      'allowedOrigins',
    ].includes(key)) || !Array.isArray(value.allowedOrigins) || value.allowedOrigins.length > PROXY_LIMITS.origins) {
    throw new CommandError('Invalid proxy policy. Expected version 1 and a bounded allowedOrigins array.');
  }
  let policy = {
    version: /** @type {const} */ (1),
    allowedOrigins: [
      ...new Set(value.allowedOrigins.map(normalizeProxyOrigin)),
    ].sort(),
  };
  if (new TextEncoder().encode(`${JSON.stringify(policy, null, 2)}\n`).byteLength > PROXY_LIMITS.policyBytes) {
    throw new CommandError('Proxy policy exceeds its supported size limit.');
  }
  return policy;
}

/**
 * @param {unknown} input
 * @returns {import('../../types/proxy.js').ProxyChange}
 */
export function validateProxyChange(input) {
  let value = /** @type {Partial<import('../../types/proxy.js').ProxyChange> | null} */ (input);
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![
    'allow',
    'remove',
  ].includes(value.command || '') || Object.keys(value).some((key) => ![
    'command',
    'origin',
  ].includes(key))) { throw new CommandError('Expected a proxy allow/remove command and origin.'); }
  return {
    command: /** @type {'allow' | 'remove'} */ (value.command),
    origin: normalizeProxyOrigin(value.origin),
  };
}

/**
 * @param {import('../../types/proxy.js').ProxyPolicy} policy
 * @param {string} target
 */
export function proxyAllowsUrl(policy, target) {
  try {
    let url = new URL(target);
    return !url.username && !url.password && policy.allowedOrigins.includes(normalizeProxyOrigin(url.origin));
  } catch { return false; }
}

/**
 * @param {string} sessionId
 * @param {import('../../types/proxy.js').ProxyPolicy} policy
 * @returns {import('../../types/proxy.js').ProxyStatus}
 */
export function proxyStatus(sessionId, policy) {
  let path = `/${sessionId}/${PROXY_PATH}`;
  return {
    enabled: policy.allowedOrigins.length > 0,
    available: false,
    policy: structuredClone(policy),
    path,
    urlTemplate: `${path}?url=<percent-encoded-absolute-source-url>`,
    limits: PROXY_LIMITS,
  };
}
