import { getSettings } from '../config/settings.js';
import { analyzeMarkup } from '../markup/analyze.js';
import { readMarkup } from '../markup/read-input.js';
import { cachedDefinitionPaths, definitionPaths, listDefinitionIds, assertPortableName } from './paths.js';
import { definitionInfo } from './descriptions.js';
import { prepareTextFile, readOptional, removeFile } from './files.js';
import { prepareCachedMarkup, readCachedMarkup } from '../sessions/cache.js';
import { isProcessAlive, readSession } from '../sessions/store.js';
import { validateProxyPolicy } from '../proxy/policy.js';
import { PROXY_LIMITS } from '../proxy/constants.js';
import { requestSession } from '../sessions/client.js';
import { INSERT_TIMEOUT_MS } from '../markup/constants.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { withSessionLock } from '../sessions/storage-lock.js';

/** @param {string} [query] */
export async function listDefinitions(query = '') {
  let ids = await listDefinitionIds();
  let definitions = await Promise.all(ids.map(definitionInfo));
  let text = query.toLowerCase();
  let matches = definitions.filter((entry) => `${entry.sessionId}\n${entry.description}\n${JSON.stringify(entry.metadata ?? {})}`.toLowerCase().includes(text));
  return { total: matches.length, definitions: matches.map(({ description, metadata, ...entry }) => entry) };
}

/**
 * @param {string} sessionId
 * @param {string} [file]
 */
export async function describeDefinition(sessionId, file) {
  return withSessionLock(sessionId, () => describeLocked(sessionId, file));
}

/**
 * @param {string} sessionId
 * @param {string} [file]
 */
async function describeLocked(sessionId, file) {
  if (await readCachedMarkup(sessionId) === undefined) {
    throw new CommandError(`No saved AGUI named ${sessionId}. Use save or insert first.`);
  }
  if (file !== undefined) {
    let text = await readMarkup(file);
    if (!text.trim()) { throw new CommandError('The description must not be empty.'); }
    await assertPortableName(sessionId);
    let pending = await prepareTextFile(definitionPaths(sessionId).descriptionPath, text);
    try { await pending.commit(); }
    finally { await pending.discard(); }
  }
  return definitionInfo(sessionId);
}

/**
 * @param {string} sessionId
 * @param {string} [file]
 */
export async function saveDefinition(sessionId, file) {
  return withSessionLock(sessionId, () => saveLocked(sessionId, file));
}

/**
 * @param {string} sessionId
 * @param {string} [file]
 */
async function saveLocked(sessionId, file) {
  let description;
  let importedProxy;
  let html = file === undefined ? await readCachedMarkup(sessionId) : await readMarkup(file);
  if (html === undefined && getSettings().folder) {
    let cached = cachedDefinitionPaths(sessionId);
    html = await readOptional(cached.htmlPath);
    description = await readOptional(cached.descriptionPath);
    importedProxy = await readOptional(cached.proxyPath, PROXY_LIMITS.policyBytes);
    if (importedProxy !== undefined) {
      try { validateProxyPolicy(JSON.parse(importedProxy)); }
      catch { throw new CommandError('Correct the private cached proxy policy before importing this definition.'); }
    }
  }
  if (html === undefined) { throw new CommandError(`No saved definition for ${sessionId}. Provide --file <HTML_PATH>.`); }
  analyzeMarkup(html);
  let pending = await prepareCachedMarkup(sessionId, html, description);
  /** @type {import('../../types/session.js').PreparedCache | undefined} */
  let proxy;
  let proxyPath = definitionPaths(sessionId).proxyPath;
  let published = false;
  try {
    if (importedProxy !== undefined) {
      proxy = await prepareTextFile(proxyPath, importedProxy, {
        text: undefined,
        maxBytes: PROXY_LIMITS.policyBytes,
      });
      await proxy.commit();
      published = true;
    }
    await pending.commit();
  } catch (error) {
    if (published && await readOptional(proxyPath, PROXY_LIMITS.policyBytes) === importedProxy) { await removeFile(proxyPath); }
    throw error;
  } finally {
    await proxy?.discard();
    await pending.discard();
  }
  return definitionInfo(sessionId);
}

/**
 * @param {string} sessionId
 * @param {boolean} [resetData]
 */
export async function syncDefinition(sessionId, resetData = false) {
  let record = await readSession(sessionId);
  if (!record || !isProcessAlive(record.pid)) {
    throw new CommandError(`Start ${sessionId} to load its saved definition. Sync applies to running sessions.`, ERROR_CODE.SESSION_STOPPED, EXIT_CODE.RUNTIME_ERROR);
  }
  if (resetData && !(await requestSession(record, 'status')).data) {
    throw new CommandError('Data reset is unavailable in this worker.', ERROR_CODE.NOT_IMPLEMENTED, EXIT_CODE.RUNTIME_ERROR);
  }
  return requestSession(record, 'sync', INSERT_TIMEOUT_MS, resetData ? JSON.stringify({ resetData: true }) : undefined);
}
