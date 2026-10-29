import { Resolver } from 'node:dns/promises';
import { isIP } from 'node:net';
import { hasErrorCode } from '../shared/system-error.js';
import { isPublicAddress } from './addresses.js';
import { proxyAllowsUrl } from './policy.js';
import { PROXY_LIMITS } from './constants.js';
import { ProxyError } from './errors.js';

/**
 * @param {string} hostname
 * @param {AbortSignal} signal
 * @returns {Promise<import('node:dns').LookupAddress[]>}
 */
export async function resolveAddresses(hostname, signal) {
  signal.throwIfAborted();
  let resolver = new Resolver();
  let cancel = () => resolver.cancel();
  signal.addEventListener('abort', cancel, {
    once: true,
  });
  try {
    let results = await Promise.allSettled([
      resolver.resolve4(hostname),
      resolver.resolve6(hostname),
    ]);
    signal.throwIfAborted();
    return results.flatMap((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value.map((address) => ({
          address,
          family: index === 0 ? 4 : 6,
        }));
      }
      if (hasErrorCode(result.reason, 'ENODATA') || hasErrorCode(result.reason, 'ENOTFOUND')) { return []; }
      throw new ProxyError('UPSTREAM_FAILED');
    });
  } finally {
    signal.removeEventListener('abort', cancel);
    if (!signal.aborted) { resolver.cancel(); }
  }
}

/**
 * @param {string} target
 * @param {import('../../types/proxy.js').ProxyPolicy} policy
 */
export function sourceUrl(target, policy) {
  let url;
  try {
    if (!target || Buffer.byteLength(target) > PROXY_LIMITS.urlBytes || /[\x00-\x20\x7f\\]/.test(target)) { throw new Error(); }
    url = new URL(target);
    if (url.username || url.password || url.hash || ![
      'http:',
      'https:',
    ].includes(url.protocol)) { throw new Error(); }
  } catch { throw new ProxyError('INVALID_REQUEST'); }
  if (!proxyAllowsUrl(policy, url.href)) { throw new ProxyError('SOURCE_DENIED'); }
  return url;
}

/**
 * @param {URL} url
 * @param {AbortSignal} signal
 * @param {typeof resolveAddresses} [resolve]
 * @returns {Promise<import('../../types/proxy.js').ProxyDestination>}
 */
export async function resolveDestination(url, signal, resolve = resolveAddresses) {
  signal.throwIfAborted();
  let hostname = url.hostname.replace(/^\[|\]$/g, '');
  let family = isIP(hostname);
  let addresses = family ? [
    {
      address: hostname,
      family,
    },
  ] : await resolve(hostname, signal);
  signal.throwIfAborted();
  if (!addresses.length || addresses.some((entry) => isIP(entry.address) !== entry.family || !isPublicAddress(entry.address))) {
    throw new ProxyError('DESTINATION_DENIED');
  }
  return {
    url,
    address: addresses.find((entry) => entry.family === 4) || addresses[0],
  };
}
