import { lstat, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';
import { cachedDefinitionPaths, getDefaultDefinitionFolder } from '../../library/paths.js';
import { getDefaultStateRoot, getStateRoot } from '../../sessions/store.js';
import { sessionKey } from '../../sessions/identity.js';
import { CommandError } from '../../shared/command-error.js';
import { canonicalPath } from '../../shared/paths.js';
import { assertProjectFolder } from '../identity.js';
import { registeredProject } from '../registry.js';

/** @param {unknown} path */
export function validExplorerPath(path) {
  return typeof path === 'string' && path.length <= 4096 && (path === ''
    || path.split('/').length <= 64 && path.split('/').every((part) => !!part && part !== '.' && part !== '..'
      && !/[\\:\x00-\x1f\x7f]/.test(part)));
}

/** @param {string} path */
export function hiddenPath(path) {
  return path.split('/').some((part) => part.startsWith('.') || part === 'node_modules');
}

/**
 * @param {string} root
 * @param {string} path
 */
export function within(root, path) {
  let child = relative(root, path);
  return child === '' || child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child);
}

/** @param {string} path */
export function assertPublicProjectPath(path) {
  for (let root of new Set([
    getDefaultStateRoot(),
    getStateRoot(),
  ])) {
    if (within(canonicalPath(root), path)) { throw new CommandError('Private AGUI runtime files are not project content. Use Default to browse saved definitions.'); }
  }
}

/** @param {string} id */
export async function explorerRoot(id) {
  let project = await registeredProject(id);
  let root = project.folder || getDefaultDefinitionFolder();
  if (project.folder) {
    await assertProjectFolder(root);
    assertPublicProjectPath(root);
  } else {
    try {
      if ((await lstat(root)).isSymbolicLink()) { throw new CommandError('The definition cache must be a directory, not a symbolic link.'); }
    } catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT') { throw error; }
    }
    root = canonicalPath(root);
  }
  return {
    id,
    root,
    cache: !project.folder,
  };
}

/** @param {string} name */
export function cacheDisplayName(name) {
  let match = /^((?:[a-f0-9]{2}){1,64})\.(html|md)$/.exec(name);
  if (!match) { return; }
  let id = Buffer.from(match[1], 'hex').toString('utf8');
  try { if (sessionKey(id) === match[1]) { return `${id}.${match[2]}`; } }
  catch { /* Ignore files outside the definition catalog's naming contract. */ }
}

/**
 * @param {Awaited<ReturnType<typeof explorerRoot>>} scope
 * @param {string} path
 * @param {boolean} showHidden
 */
export async function resolveExplorerPath(scope, path, showHidden) {
  if (!validExplorerPath(path)) { throw new CommandError('Choose a project-relative path without parent traversal.'); }
  if (!scope.cache && !showHidden && hiddenPath(path)) { throw new CommandError('Enable hidden files and dependencies to inspect this path.'); }
  let candidate = join(scope.root, ...path.split('/'));
  if (scope.cache && path) {
    let match = /^([^/]+)\.(html|md)$/.exec(path);
    if (!match) { throw new CommandError('Default exposes saved HTML and Markdown definitions only.'); }
    let paths = cachedDefinitionPaths(match[1]);
    candidate = match[2] === 'html' ? paths.htmlPath : paths.descriptionPath;
  }
  let resolved = await realpath(candidate);
  if (!within(scope.root, resolved)) { throw new CommandError('This path leaves the connected project.'); }
  if (!scope.cache) {
    assertPublicProjectPath(resolved);
    if (!showHidden && hiddenPath(relative(scope.root, resolved).split(sep).join('/'))) {
      throw new CommandError('This link points to hidden content. Enable hidden files to inspect it.');
    }
  }
  return resolved;
}
