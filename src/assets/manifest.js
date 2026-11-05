import { createHash } from 'node:crypto';
import { lstat } from 'node:fs/promises';
import { CommandError } from '../shared/command-error.js';
import { hasErrorCode } from '../shared/system-error.js';
import { ASSET_LIMITS } from './constants.js';
import { assetPath, assetContentType } from './paths.js';
import { scanAssets } from './inventory.js';
import { assertAssetRoot, assetFileInfo, assertAssetFileUnchanged, readAssetSource, resolveAssetFile } from './files.js';

/** @param {Uint8Array} bytes */
export function assetDigest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * @param {unknown} input
 * @returns {import('../../types/assets.js').AssetManifest | null}
 */
export function validateAssetManifest(input) {
  if (input === null) { return null; }
  let value = /** @type {import('../../types/assets.js').AssetManifest} */ (input);
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== 'directories,files'
    || !Array.isArray(value.directories) || !Array.isArray(value.files) || value.files.length > ASSET_LIMITS.files
    || value.directories.length + value.files.length > ASSET_LIMITS.entries) { throw new CommandError('Invalid asset manifest.'); }
  let names = new Map();
  let bytes = 0;
  for (let path of value.directories) {
    assetPath(path);
    if (names.has(path.toLowerCase())) { throw new CommandError('Duplicate or conflicting asset path.'); }
    names.set(path.toLowerCase(), path);
  }
  let directories = new Set(value.directories);
  for (let file of value.files) {
    if (!file || typeof file !== 'object' || Object.keys(file).sort().join(',') !== 'path,sha256,size'
      || !Number.isSafeInteger(file.size) || file.size < 0 || file.size > ASSET_LIMITS.fileBytes
      || typeof file.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(file.sha256)) { throw new CommandError('Invalid asset file manifest.'); }
    assetPath(file.path);
    assetContentType(file.path);
    if (names.has(file.path.toLowerCase())) { throw new CommandError('Duplicate or conflicting asset path.'); }
    names.set(file.path.toLowerCase(), file.path);
    bytes += file.size;
  }
  for (let path of names.values()) {
    let parts = path.split('/');
    for (let i = 1; i < parts.length; i++) {
      if (!directories.has(parts.slice(0, i).join('/'))) { throw new CommandError('An asset parent directory is missing or has conflicting case.'); }
    }
  }
  if (bytes > ASSET_LIMITS.totalBytes || Buffer.byteLength(JSON.stringify(value)) > ASSET_LIMITS.manifestBytes) {
    throw new CommandError('Asset manifest exceeds its size limits.');
  }
  return {
    directories: [
      ...value.directories,
    ].sort(),
    files: [
      ...value.files,
    ].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
  };
}

/**
 * Caller holds the relevant asset lock. No asset bytes enter the manifest.
 * @param {string} directory
 * @returns {Promise<import('../../types/assets.js').AssetManifest | null>}
 */
export async function snapshotAssetTree(directory) {
  try { await lstat(directory); }
  catch (error) { if (hasErrorCode(error, 'ENOENT')) { return null; } throw error; }
  let inventory = await scanAssets(directory);
  if (!inventory.root) { throw new CommandError('Asset directory disappeared during capture.'); }
  let root = inventory.root;
  let files = [];
  let identities = new Map();
  for (let entry of inventory.entries) {
    let path = await resolveAssetFile(root, entry.path);
    let info = await assetFileInfo(path);
    let bytes = await readAssetSource(path);
    await assertAssetFileUnchanged(path, info);
    if (entry.size !== bytes.length) { throw new CommandError('Asset tree changed during capture.'); }
    identities.set(path, info);
    files.push({
      path: entry.path,
      size: bytes.length,
      sha256: assetDigest(bytes),
    });
  }
  let after = await scanAssets(directory);
  await assertAssetRoot(root);
  if (JSON.stringify(after.entries) !== JSON.stringify(inventory.entries)
    || JSON.stringify(after.directories) !== JSON.stringify(inventory.directories)) { throw new CommandError('Asset tree changed during capture.'); }
  for (let [
    path,
    info,
  ] of identities) { await assertAssetFileUnchanged(path, info); }
  return validateAssetManifest({
    directories: inventory.directories,
    files,
  });
}

/**
 * @param {import('../../types/assets.js').AssetManifest | null} actual
 * @param {import('../../types/assets.js').AssetManifest | null} expected
 * @param {string} [message]
 */
export function assertAssetManifest(actual, expected, message = 'Asset files changed. Keep both copies and reconcile before retrying.') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) { throw new CommandError(message); }
}

/**
 * Permit a partially published/removed tree, but never changed or extra files.
 * @param {import('../../types/assets.js').AssetManifest | null} actual
 * @param {import('../../types/assets.js').AssetManifest | null} expected
 */
export function assertAssetSubset(actual, expected) {
  if (!actual) { return; }
  if (!expected || actual.directories.some((path) => !expected.directories.includes(path))
    || actual.files.some((file) => !expected.files.some((planned) => file.path === planned.path && file.size === planned.size && file.sha256 === planned.sha256))) {
    throw new CommandError('Asset files changed after publication. Keep both copies and reconcile before recovery.');
  }
}
