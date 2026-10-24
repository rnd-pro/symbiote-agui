import { readdir } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { readOptional } from '../library/files.js';
import { hasErrorCode } from '../shared/system-error.js';
import { projectEntry, validFolder } from './identity.js';

/** @param {string} path */
async function directories(path) {
  try { return (await readdir(path, {
    withFileTypes: true,
  })).filter((entry) => entry.isDirectory()); }
  catch (error) {
    if (hasErrorCode(error, 'ENOENT')) { return []; }
    throw error;
  }
}

/**
 * Recover only known manager scopes when first creating the shared registry.
 * @param {string} root
 */
export async function recoverProjects(root) {
  let projects = [
    projectEntry(undefined),
  ];
  for (let scope of await directories(join(root, '.libraries'))) {
    if (!/^[a-f0-9]{64}$/.test(scope.name)) { continue; }
    let stateRoot = join(root, '.libraries', scope.name);
    for (let manager of await directories(join(stateRoot, '.manager'))) {
      if (!/^[a-f0-9-]{36}$/.test(manager.name)) { continue; }
      let source = await readOptional(join(stateRoot, '.manager', manager.name, 'manager.json'), 65536);
      if (!source) { continue; }
      try {
        let record = JSON.parse(source);
        let folder = record.settings?.folder;
        if (!validFolder(folder) || !isAbsolute(folder) || record.stateRoot !== stateRoot) { continue; }
        let entry = projectEntry(folder);
        if (entry.id === scope.name && !projects.some((project) => project.id === entry.id)) { projects.push(entry); }
      } catch { /* Incomplete historical records cannot supply a trusted project identity. */ }
    }
  }
  return projects;
}
