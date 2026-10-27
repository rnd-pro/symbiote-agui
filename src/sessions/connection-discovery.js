import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { getDefaultStateRoot, readScopedSession, isProcessAlive } from './store.js';
import { decodeSessionKey } from './list.js';
import { validProjectId } from '../projects/identifiers.js';
import { hasErrorCode, errorMessage } from '../shared/system-error.js';
import { CommandError } from '../shared/command-error.js';

/**
 * @typedef {object} WorkerTarget
 * @property {import('../../types/session.js').SessionRecord} record
 * @property {string} stateRoot
 * @property {string} projectId
 */

/** @param {string} id */
export function connectionProjectRoot(id) {
  if (!validProjectId(id)) { throw new CommandError('Choose a project from Connections.'); }
  return id === 'default' ? getDefaultStateRoot() : join(getDefaultStateRoot(), '.libraries', id);
}

/** @param {string} directory */
async function directories(directory) {
  try { return (await readdir(directory, {
    withFileTypes: true,
  })).filter((entry) => entry.isDirectory()); }
  catch (error) {
    if (hasErrorCode(error, 'ENOENT')) { return []; }
    throw error;
  }
}

export async function discoverConnectionWorkers() {
  /** @type {WorkerTarget[]} */
  let workers = [];
  /** @type {string[]} */
  let errors = [];
  let projects = [
    'default',
  ];
  try {
    projects.push(...(await directories(join(getDefaultStateRoot(), '.libraries')))
      .map((entry) => entry.name).filter((name) => /^[a-f0-9]{64}$/.test(name)));
  } catch (error) { errors.push(errorMessage(error)); }
  for (let projectId of projects) {
    let stateRoot = connectionProjectRoot(projectId);
    try {
      for (let entry of await directories(stateRoot)) {
        let sessionId = decodeSessionKey(entry.name);
        if (!sessionId) { continue; }
        try {
          let record = await readScopedSession(sessionId, stateRoot);
          if (record && isProcessAlive(record.pid)) { workers.push({
            record,
            stateRoot,
            projectId,
          }); }
        } catch (error) { errors.push(`${projectId}/${sessionId}: ${errorMessage(error)}`); }
      }
    } catch (error) { errors.push(`${projectId}: ${errorMessage(error)}`); }
  }
  return {
    workers,
    errors,
  };
}
