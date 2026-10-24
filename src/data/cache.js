import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { getStateRoot } from '../sessions/store.js';
import { assertSessionId, sessionKey } from '../sessions/identity.js';
import { prepareTextFile, readOptional, removeFile, storageError } from '../library/files.js';
import { MAX_HTML_BYTES } from '../markup/constants.js';

let prefix = '<!--agui-data-cache ';

/** @param {string} source */
export function sourceHash(source) { return createHash('sha256').update(source).digest('hex'); }

/**
 * @param {string} sessionId
 * @param {string} [root]
 */
export function runtimeCachePath(sessionId, root = getStateRoot()) {
  assertSessionId(sessionId);
  return join(root, '.runtime', `${sessionKey(sessionId)}.html`);
}

/**
 * @param {string} sessionId
 * @returns {Promise<import('../../types/data.js').RuntimeDataCache | undefined>}
 * @param {string} [root]
 */
export async function readRuntimeCache(sessionId, root = getStateRoot()) {
  let path = runtimeCachePath(sessionId, root);
  let raw = await readOptional(path, MAX_HTML_BYTES + 1024);
  if (raw === undefined) { return; }
  try {
    let end = raw.indexOf('-->\n');
    if (!raw.startsWith(prefix) || end < 0 || end > 512) { throw new Error(); }
    let header = JSON.parse(raw.slice(prefix.length, end));
    let html = raw.slice(end + 4);
    if (header.version !== 1 || !/^[\da-f]{64}$/.test(header.sourceHash) || !/^[\da-f-]{36}$/i.test(header.revision)
      || Object.keys(header).length !== 3 || Buffer.byteLength(html) > MAX_HTML_BYTES) { throw new Error(); }
    return { html, sourceHash: header.sourceHash, revision: header.revision, raw };
  } catch { throw storageError(path, new Error('Invalid private data cache.')); }
}

/**
 * @param {string} sessionId
 * @param {string} html
 * @param {string} source
 * @param {string} revision
 * @param {string | undefined} expected
 */
export async function prepareRuntimeCache(sessionId, html, source, revision, expected) {
  let raw = runtimeCacheText(html, source, revision);
  let pending = await prepareTextFile(runtimeCachePath(sessionId), raw, { text: expected, maxBytes: MAX_HTML_BYTES + 1024 });
  return { ...pending, raw };
}

/**
 * @param {string} html
 * @param {string} source
 * @param {string} revision
 */
export function runtimeCacheText(html, source, revision) {
  let raw = `${prefix}${JSON.stringify({ version: 1, sourceHash: sourceHash(source), revision })}-->\n${html}`;
  if (Buffer.byteLength(html) > MAX_HTML_BYTES) { throw new Error('Saved markup exceeds 1 MiB.'); }
  return raw;
}

/** @param {string} sessionId */
export async function clearRuntimeCache(sessionId) { await removeFile(runtimeCachePath(sessionId)); }
