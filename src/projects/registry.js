import { resolve } from 'node:path';
import { getDefaultStateRoot } from '../sessions/store.js';
import { prepareTextFile, readOptional, storageError } from '../library/files.js';
import { canonicalPath } from '../shared/paths.js';
import { CommandError } from '../shared/command-error.js';
import { errorMessage } from '../shared/system-error.js';
import { assertProjectFolder, projectEntry, projectId, validFolder, validProject, validProjectId } from './identity.js';
import { withProjectLock } from './lock.js';
import { recoverProjects } from './recovery.js';

/**
 * @template T
 * @param {(registry: import('../../types/projects.js').ProjectRegistry) => T | Promise<T>} task
 */
async function changeRegistry(task) {
  let root = getDefaultStateRoot();
  let path = resolve(root, '.projects.json');
  return withProjectLock(root, async () => {
    let source = await readOptional(path);
    /** @type {import('../../types/projects.js').ProjectRegistry} */
    let registry;
    if (source === undefined) {
      registry = {
        version: 1,
        projects: await recoverProjects(root),
      };
    } else {
      try {
        registry = JSON.parse(source);
        if (!registry || registry.version !== 1 || Object.keys(registry).some((key) => ![
          'version',
          'projects',
        ].includes(key)) || !Array.isArray(registry.projects) || !registry.projects.every(validProject)
          || !registry.projects.some((entry) => entry.id === 'default')
          || new Set(registry.projects.map((entry) => entry.id)).size !== registry.projects.length) {
          throw new Error('Invalid project registry.');
        }
      } catch (error) { throw storageError(path, error); }
    }
    let result = await task(registry);
    let text = JSON.stringify(registry, null, 2) + '\n';
    if (text !== source) {
      let pending = await prepareTextFile(path, text, {
        text: source,
      });
      try { await pending.commit(); }
      finally { await pending.discard(); }
    }
    return result;
  });
}

/**
 * @param {string | undefined} folder
 * @param {boolean} [used]
 */
export async function rememberProject(folder, used = false) {
  let candidate = projectEntry(folder);
  return changeRegistry((registry) => {
    let entry = registry.projects.find((project) => project.id === candidate.id);
    if (!entry) { entry = candidate; registry.projects.push(entry); }
    if (used) { entry.lastUsedAt = new Date().toISOString(); }
    return structuredClone(entry);
  });
}

/**
 * @param {string} folder
 * @param {string} [directory]
 */
export async function connectProject(folder, directory = process.cwd()) {
  if (!validFolder(folder)) { throw new CommandError('Choose a nonempty project folder.'); }
  let path = canonicalPath(resolve(directory, folder));
  await assertProjectFolder(path);
  return rememberProject(path);
}

/** @param {string} id */
export async function registeredProject(id) {
  if (!validProjectId(id)) { throw new CommandError('Choose a connected project.'); }
  return changeRegistry((registry) => {
    let entry = registry.projects.find((project) => project.id === id);
    if (!entry) { throw new CommandError('Project is not connected. Refresh the project list.'); }
    return structuredClone(entry);
  });
}

/**
 * @param {string} id
 * @param {string | undefined} currentFolder
 */
export async function forgetProject(id, currentFolder) {
  if (!validProjectId(id)) { throw new CommandError('Choose a connected project.'); }
  if (id === 'default') { throw new CommandError('Default cannot be forgotten.'); }
  if (id === projectId(currentFolder)) { throw new CommandError('Switch to another project before forgetting this one.'); }
  await changeRegistry((registry) => {
    if (!registry.projects.some((project) => project.id === id)) { throw new CommandError('Project is not connected. Refresh the project list.'); }
    registry.projects = registry.projects.filter((project) => project.id !== id);
  });
}

/**
 * @param {string | undefined} currentFolder
 * @returns {Promise<import('../../types/projects.js').ProjectListing>}
 */
export async function listProjects(currentFolder) {
  await rememberProject(currentFolder);
  let projects = await changeRegistry((registry) => structuredClone(registry.projects));
  let entries = await Promise.all(projects.map(async (entry) => {
    try {
      if (entry.folder) { await assertProjectFolder(entry.folder); }
      return {
        ...entry,
        available: true,
      };
    } catch (error) {
      return {
        ...entry,
        available: false,
        error: errorMessage(error),
      };
    }
  }));
  entries.sort((left, right) => left.id === 'default' ? -1 : right.id === 'default' ? 1
    : (right.lastUsedAt || '').localeCompare(left.lastUsedAt || '') || left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
  return {
    currentProjectId: projectId(currentFolder),
    projects: entries,
  };
}
