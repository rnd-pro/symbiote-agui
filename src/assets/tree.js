import { lstat, mkdir, rmdir, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { prepareFile } from '../library/files.js';
import { CommandError } from '../shared/command-error.js';
import { assetRoot, assertAssetRoot, assetFileInfo, assertAssetFileUnchanged, readAssetSource, resolveAssetDirectory, resolveAssetFile } from './files.js';
import { assertAssetManifest, assertAssetSubset, assetDigest, snapshotAssetTree } from './manifest.js';

/**
 * @param {string} source
 * @param {string} destination
 * @param {import('../../types/assets.js').AssetManifest | null} manifest
 * @param {(root: import('../../types/assets.js').AssetRoot) => Promise<void>} [created]
 */
export async function copyAssetTree(source, destination, manifest, created) {
  if (!manifest) { return; }
  assertAssetManifest(await snapshotAssetTree(source), manifest, 'Source assets differ from the captured revision.');
  // Exclusive mkdir reserves ownership; rename could overwrite an existing empty directory.
  await mkdir(dirname(destination), {
    recursive: true,
    mode: 0o700,
  });
  await mkdir(destination, {
    mode: 0o700,
  });
  let target = await assetRoot(destination);
  if (!target) { throw new CommandError('Asset directory changed while preparing the copy.'); }
  await created?.(target);
  await fillAssetTree(source, destination, manifest);
}

/**
 * Complete a validated partial restore without overwriting existing entries.
 * @param {string} source
 * @param {string} destination
 * @param {import('../../types/assets.js').AssetManifest} manifest
 */
export async function fillAssetTree(source, destination, manifest) {
  assertAssetManifest(await snapshotAssetTree(source), manifest);
  let existing = await snapshotAssetTree(destination);
  assertAssetSubset(existing, manifest);
  let target = await assetRoot(destination);
  let origin = await assetRoot(source);
  if (!target || !origin) { throw new CommandError('Asset directories changed while restoring.'); }
  for (let directory of manifest.directories) { await resolveAssetDirectory(target, directory, true); }
  for (let file of manifest.files) {
    if (existing?.files.some((entry) => entry.path === file.path)) { continue; }
    let bytes = await readAssetSource(await resolveAssetFile(origin, file.path));
    if (bytes.length !== file.size || assetDigest(bytes) !== file.sha256) { throw new CommandError('Source assets changed during copying.'); }
    let path = await resolveAssetFile(target, file.path, true);
    let pending = await prepareFile(path, bytes);
    try {
      await assertAssetRoot(target);
      await resolveAssetFile(target, file.path);
      await pending.commit();
    } finally { await pending.discard(); }
  }
  assertAssetManifest(await snapshotAssetTree(destination), manifest);
  assertAssetManifest(await snapshotAssetTree(source), manifest);
}

/**
 * Remove only a captured regular tree, refusing links, new entries, and changed bytes.
 * @param {string} directory
 * @param {import('../../types/assets.js').AssetManifest | null} manifest
 */
export async function removeAssetTree(directory, manifest) {
  assertAssetManifest(await snapshotAssetTree(directory), manifest);
  if (!manifest) { return; }
  let root = await assetRoot(directory);
  if (!root) { throw new CommandError('The asset directory disappeared.'); }
  for (let file of manifest.files) {
    await assertAssetRoot(root);
    let path = await resolveAssetFile(root, file.path);
    let before = await assetFileInfo(path);
    let bytes = await readAssetSource(path);
    if (bytes.length !== file.size || assetDigest(bytes) !== file.sha256) { throw new CommandError('Asset changed before removal.'); }
    await assertAssetFileUnchanged(path, before);
    await unlink(path);
  }
  let directories = [
    ...manifest.directories,
  ].sort((a, b) => b.split('/').length - a.split('/').length);
  for (let directory of directories) {
    await assertAssetRoot(root);
    await rmdir(await resolveAssetDirectory(root, directory));
  }
  await assertAssetRoot(root);
  await rmdir(root.path);
}

/**
 * @param {string} directory
 * @param {import('../../types/assets.js').AssetIdentity} identity
 */
export async function assertAssetOwnership(directory, identity) {
  let info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink() || info.dev !== identity.dev || info.ino !== identity.ino) {
    throw new CommandError('The destination asset directory changed ownership. Preserve it and reconcile the transfer.');
  }
}
