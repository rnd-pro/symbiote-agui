import { opendir } from 'node:fs/promises';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE } from '../shared/constants.js';
import { ASSET_LIMITS } from './constants.js';
import { assetRoot, assertAssetRoot, assetFileInfo, resolveAssetDirectory, resolveAssetFile } from './files.js';
import { assetEntry, assetPath } from './paths.js';

/**
 * @param {string} path
 * @param {AbortSignal} [signal]
 * @returns {Promise<import('../../types/assets.js').AssetInventory>}
 */
export async function scanAssets(path, signal) {
  signal?.throwIfAborted();
  let root = await assetRoot(path);
  /** @type {import('../../types/assets.js').AssetInventory} */
  let result = {
    root,
    entries: [],
    directories: [],
    totalBytes: 0,
  };
  if (!root) { return result; }
  let visited = 0;
  /** @param {string} relative */
  let walk = async (relative) => {
    signal?.throwIfAborted();
    if (!root) { return; }
    let directory = await resolveAssetDirectory(root, relative);
    let names = new Set();
    for await (let entry of await opendir(directory)) {
      signal?.throwIfAborted();
      if (++visited > ASSET_LIMITS.entries) { throw new CommandError('Asset tree exceeds its entry limit.', ERROR_CODE.INPUT_TOO_LARGE); }
      let child = assetPath(relative ? `${relative}/${entry.name}` : entry.name);
      let key = entry.name.toLowerCase();
      if (names.has(key)) { throw new CommandError('Asset entries must differ beyond letter case.'); }
      names.add(key);
      if (entry.isSymbolicLink() || !entry.isDirectory() && !entry.isFile()) {
        throw new CommandError('Asset trees cannot contain symbolic links or special files.');
      }
      if (entry.isDirectory()) {
        result.directories.push(child);
        await walk(child);
      } else {
        let file = await resolveAssetFile(root, child);
        let info = await assetFileInfo(file);
        result.totalBytes += info.size;
        result.entries.push(assetEntry(child, info.size));
        if (result.entries.length > ASSET_LIMITS.files || result.totalBytes > ASSET_LIMITS.totalBytes) {
          throw new CommandError('Asset tree exceeds its file count or total byte limit.', ERROR_CODE.INPUT_TOO_LARGE);
        }
      }
    }
    await assertAssetRoot(root);
  };
  await walk('');
  signal?.throwIfAborted();
  result.entries.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  result.directories.sort();
  return result;
}
