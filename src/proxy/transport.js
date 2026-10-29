import http from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';
import { isPublicAddress } from './addresses.js';
import { PROXY_LIMITS } from './constants.js';
import { ProxyError } from './errors.js';

/**
 * @param {import('../../types/proxy.js').ProxyDestination} destination
 * @param {string} method
 * @param {AbortSignal} signal
 * @returns {import('node:https').RequestOptions}
 */
export function proxyRequestOptions(destination, method, signal) {
  let {
    url,
    address,
  } = destination;
  if (!isPublicAddress(address.address) || isIP(address.address) !== address.family) { throw new ProxyError('DESTINATION_DENIED'); }
  let hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(hostname) && hostname !== address.address) { throw new ProxyError('DESTINATION_DENIED'); }
  /** @type {import('node:net').LookupFunction} */
  let lookup = (requested, options, callback) => {
    if (requested !== hostname) { callback(new ProxyError('DESTINATION_DENIED'), ''); return; }
    // No second DNS lookup and no pooled sockets can escape this validated pin.
    if (options.all) { callback(null, [
      address,
    ]); }
    else { callback(null, address.address, address.family); }
  };
  return {
    method,
    signal,
    lookup,
    family: address.family,
    agent: false,
    servername: isIP(hostname) ? undefined : hostname,
    rejectUnauthorized: true,
    maxHeaderSize: PROXY_LIMITS.headerBytes,
    headers: {
      accept: '*/*',
      'accept-encoding': 'gzip, deflate, br',
      'user-agent': 'symbiote-agui',
    },
  };
}

/**
 * @param {import('../../types/proxy.js').ProxyDestination} destination
 * @param {string} method
 * @param {AbortSignal} signal
 * @returns {Promise<import('node:http').IncomingMessage>}
 */
export function openProxyResponse(destination, method, signal) {
  return new Promise((resolve, reject) => {
    let options = proxyRequestOptions(destination, method, signal);
    let transport = destination.url.protocol === 'https:' ? https : http;
    let request = transport.request(destination.url, options, resolve);
    request.on('error', reject);
    request.once('upgrade', (_response, socket) => {
      socket.destroy();
      reject(new ProxyError('UPSTREAM_FAILED'));
    });
    request.end();
  });
}
