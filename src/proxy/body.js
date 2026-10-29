import { Transform, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip, createInflate, createBrotliDecompress } from 'node:zlib';
import { ProxyError } from './errors.js';

let decoders = {
  gzip: createGunzip,
  deflate: createInflate,
  br: createBrotliDecompress,
};

/** @param {string | undefined} value */
export function assetContentType(value) {
  let type = value?.split(';')[0].trim().toLowerCase() || '';
  if (![
    'application/json',
    'text/plain',
    'text/markdown',
    'text/x-markdown',
    'application/xml',
    'text/xml',
    'application/rss+xml',
    'application/atom+xml',
    'application/rdf+xml',
    'text/rss+xml',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/bmp',
    'image/x-icon',
    'image/vnd.microsoft.icon',
  ].includes(type) && !/^application\/[a-z0-9.-]+\+json$/.test(type)) { throw new ProxyError('UNSUPPORTED_TYPE'); }
  return value;
}

/**
 * @param {import('node:http').IncomingMessage} upstream
 * @param {number} limit
 * @param {AbortSignal} signal
 */
export async function readProxyBody(upstream, limit, signal) {
  let length = upstream.headers['content-length'];
  if (length && (!/^\d+$/.test(length) || Number(length) > limit)) { throw new ProxyError('TOO_LARGE'); }
  let encoding = (upstream.headers['content-encoding'] || 'identity').trim().toLowerCase();
  if (encoding !== 'identity' && !Object.hasOwn(decoders, encoding)) { throw new ProxyError('UPSTREAM_FAILED'); }
  let wireBytes = 0;
  let decodedBytes = 0;
  /** @type {Buffer[]} */
  let chunks = [];
  let count = new Transform({
    transform(chunk, _encoding, callback) {
      wireBytes += chunk.length;
      callback(wireBytes > limit ? new ProxyError('TOO_LARGE') : null, chunk);
    },
  });
  let output = new Writable({
    write(chunk, _encoding, callback) {
      decodedBytes += chunk.length;
      if (decodedBytes > limit) { callback(new ProxyError('TOO_LARGE')); return; }
      chunks.push(chunk);
      callback();
    },
  });
  if (encoding === 'identity') { await pipeline(upstream, count, output, {
    signal,
  }); }
  else { await pipeline(upstream, count, decoders[/** @type {keyof typeof decoders} */ (encoding)](), output, {
    signal,
  }); }
  return Buffer.concat(chunks, decodedBytes);
}
