import { dirname, join } from 'node:path';
import { lstat, readdir } from 'node:fs/promises';
import { scopedDefinitionPaths } from '../../library/paths.js';
import { metadataPath } from '../../metadata/store.js';
import { runtimeCachePath } from '../../data/cache.js';
import { stateRootForFolder } from '../../sessions/store.js';
import { withSessionLock } from '../../sessions/storage-lock.js';
import { CommandError } from '../../shared/command-error.js';
import { hasErrorCode } from '../../shared/system-error.js';
import { assertProjectFolder } from '../identity.js';
import { registeredProject } from '../registry.js';
import { cacheDisplayName } from '../explorer/access.js';

/**
 * @param {string} id
 * @returns {Promise<import('../../../types/transfer.js').TransferScope>}
 */
export async function transferScope(id) {
  let project = await registeredProject(id);
  if (project.folder) { await assertProjectFolder(project.folder); }
  return {
    ...project,
    stateRoot: stateRootForFolder(project.folder),
  };
}

/**
 * @param {import('../../../types/transfer.js').TransferScope} scope
 * @param {string} sessionId
 * @returns {Record<import('../../../types/transfer.js').TransferFileKey, string>}
 */
export function transferPaths(scope, sessionId) {
  let paths = scopedDefinitionPaths(sessionId, scope.folder);
  return {
    proxy: paths.proxyPath,
    html: paths.htmlPath,
    description: paths.descriptionPath,
    metadata: metadataPath(sessionId, scope.stateRoot),
    data: runtimeCachePath(sessionId, scope.stateRoot),
  };
}

/**
 * @template T
 * @param {import('../../../types/transfer.js').TransferReceipt} receipt
 * @param {() => Promise<T>} task
 */
export function lockTransfer(receipt, task) {
  let entries = [
    {
      root: receipt.source.stateRoot,
      id: receipt.sessionId,
    },
    {
      root: receipt.destination.stateRoot,
      id: receipt.destinationSessionId,
    },
  ].sort((a, b) => `${a.root}/${a.id.toLowerCase()}`.localeCompare(`${b.root}/${b.id.toLowerCase()}`));
  if (entries[0].root === entries[1].root && entries[0].id.toLowerCase() === entries[1].id.toLowerCase()) {
    throw new CommandError('Choose a different project or an ID that differs beyond letter case.');
  }
  return withSessionLock(entries[0].id, () => withSessionLock(entries[1].id, task, entries[1].root, receipt.id), entries[0].root, receipt.id);
}

/**
 * @param {import('../../../types/transfer.js').TransferScope} scope
 * @param {string} sessionId
 */
export async function assertDestinationEmpty(scope, sessionId) {
  let paths = transferPaths(scope, sessionId);
  for (let path of Object.values(paths)) {
    try { await lstat(path); }
    catch (error) { if (hasErrorCode(error, 'ENOENT')) { continue; } throw error; }
    throw new CommandError(`Destination ${sessionId} already has saved files or data. Choose another ID.`);
  }
  let names = await readdir(dirname(paths.html)).catch((error) => {
    if (hasErrorCode(error, 'ENOENT')) { return []; }
    throw error;
  });
  if (names.some((name) => {
    let display = scope.folder ? name : cacheDisplayName(name);
    return [
      `${sessionId}.html`,
      `${sessionId}.md`,
      `${sessionId}.proxy.json`,
    ].some((expected) => display?.toLowerCase() === expected.toLowerCase());
  })) { throw new CommandError('The destination has a conflicting name. Choose an ID that differs beyond letter case.'); }
}

/**
 * @param {string} path
 * @param {string} id
 */
export function quarantinePath(path, id) {
  return join(dirname(path), `.${path.split(/[\\/]/).at(-1)}.${id}.moving`);
}
