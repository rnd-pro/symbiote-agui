import { readFileSync } from 'node:fs';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { errorMessage, hasErrorCode } from '../shared/system-error.js';
import { canonicalPath } from '../shared/paths.js';

export let CONFIG_FILE = '.agui.json';

/** @param {string} projectDirectory */
function projectConfig(projectDirectory) {
  let directory = resolve(projectDirectory);
  while (true) {
    let path = join(directory, CONFIG_FILE);
    try {
      let value = JSON.parse(readFileSync(path, 'utf8'));
      if (!value || typeof value !== 'object' || Array.isArray(value)
        || (value.folder !== undefined && (typeof value.folder !== 'string' || !value.folder.trim()))) {
        throw new Error('Expected an object with an optional nonempty folder string.');
      }
      return { path, value };
    } catch (error) {
      if (!hasErrorCode(error, 'ENOENT')) {
        throw new CommandError(`Cannot read ${path}: ${errorMessage(error)}`, ERROR_CODE.CONFIG_ERROR, EXIT_CODE.RUNTIME_ERROR);
      }
    }
    let parent = dirname(directory);
    if (parent === directory) {
      return {
        path: join(projectDirectory, CONFIG_FILE),
        value: {
        },
      };
    }
    directory = parent;
  }
}

/**
 * @param {string} [projectDirectory]
 * @returns {import('../../types/library.js').StorageSettings}
 */
export function getProjectSettings(projectDirectory = process.cwd()) {
  let config = projectConfig(projectDirectory);
  let folder = config.value.folder ? canonicalPath(resolve(dirname(config.path), config.value.folder)) : undefined;
  return {
    mode: folder ? 'folder' : 'cache',
    folder,
    source: 'project',
    configPath: config.path,
  };
}

/**
 * @param {string} [projectDirectory]
 * @returns {import('../../types/library.js').StorageSettings}
 */
export function getSettings(projectDirectory = process.cwd()) {
  if (process.env.AGUI_LIBRARY_DIR !== undefined) {
    let value = process.env.AGUI_LIBRARY_DIR;
    if (value && !isAbsolute(value)) {
      throw new CommandError('AGUI_LIBRARY_DIR must be an absolute path.', ERROR_CODE.CONFIG_ERROR);
    }
    return { mode: value ? 'folder' : 'cache', folder: value ? canonicalPath(value) : undefined, source: 'environment' };
  }
  return getProjectSettings(projectDirectory);
}

/**
 * @param {string | undefined} folder
 * @param {string} [projectDirectory]
 */
export async function configureFolder(folder, projectDirectory = process.cwd()) {
  let config = projectConfig(projectDirectory);
  if (folder !== undefined) {
    let absolute = resolve(projectDirectory, folder);
    try { await mkdir(absolute, { recursive: true }); }
    catch (error) { throw new CommandError(`Cannot create ${absolute}: ${errorMessage(error)}`, ERROR_CODE.CONFIG_ERROR, EXIT_CODE.RUNTIME_ERROR); }
    config.value.folder = relative(dirname(config.path), canonicalPath(absolute)) || '.';
  } else {
    delete config.value.folder;
  }
  let temporary = `${config.path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(config.value, null, 2)}\n`, { flag: 'wx' });
    await rename(temporary, config.path);
  } catch (error) {
    throw new CommandError(`Cannot write ${config.path}: ${errorMessage(error)}`, ERROR_CODE.CONFIG_ERROR, EXIT_CODE.RUNTIME_ERROR);
  } finally {
    await unlink(temporary).catch((error) => { if (!hasErrorCode(error, 'ENOENT')) { throw error; } });
  }
  return getSettings(projectDirectory);
}
