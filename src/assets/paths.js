import { extname } from 'node:path';
import { CommandError } from '../shared/command-error.js';
import { ASSET_LIMITS, ASSET_PATH, ASSET_TYPES } from './constants.js';

/** @param {unknown} value */
export function assetPath(value) {
  if (typeof value !== 'string' || !value || value.length > ASSET_LIMITS.pathLength) {
    throw new CommandError('Choose a bounded, asset-relative path.');
  }
  let segments = value.split('/');
  if (segments.length > ASSET_LIMITS.depth || segments.some((part) => part.length > ASSET_LIMITS.segmentLength
    || !/^[a-zA-Z0-9_][a-zA-Z0-9_. -]*$/.test(part) || /[. ]$/.test(part)
    || /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part))) {
    throw new CommandError('Use portable relative asset names without hidden entries, reserved names, encoded paths, or parent traversal.');
  }
  return value;
}

/** @param {string} raw */
export function decodeAssetPath(raw) {
  let segments = raw.split('/').map((segment) => {
    let decoded = decodeURIComponent(segment);
    if (decoded.includes('/')) { throw new CommandError('Encoded asset separators are not allowed.'); }
    return decoded;
  });
  return assetPath(segments.join('/'));
}

/** @param {string} path */
export function assetContentType(path) {
  let type = ASSET_TYPES[extname(path).toLowerCase()];
  if (!type) { throw new CommandError('Unsupported asset type. Use an image, font, CSS, browser module, JSON, Markdown, or text file.'); }
  return type;
}

/**
 * @param {string} path
 * @param {number} size
 * @returns {import('../../types/assets.js').AssetEntry}
 */
export function assetEntry(path, size) {
  return {
    path,
    size,
    contentType: assetContentType(path),
    url: `./${ASSET_PATH}/${path.split('/').map(encodeURIComponent).join('/')}`,
  };
}

/**
 * @param {import('../../types/assets.js').AssetInventory} inventory
 * @param {string} path
 */
export function assertAssetName(inventory, path) {
  let names = new Set([
    ...inventory.directories,
    ...inventory.entries.map((entry) => entry.path),
  ]);
  let parts = path.split('/');
  for (let i = 1; i <= parts.length; i++) {
    let prefix = parts.slice(0, i).join('/');
    if (Array.from(names).some((name) => name !== prefix && name.toLowerCase() === prefix.toLowerCase())) {
      throw new CommandError('The asset name conflicts beyond letter case with an existing entry. Use its exact spelling or choose another name.');
    }
  }
  if (inventory.directories.includes(path) || parts.slice(0, -1).some((_, i) =>
    inventory.entries.some((entry) => entry.path === parts.slice(0, i + 1).join('/')))) {
    throw new CommandError('An asset file and directory cannot have the same path.');
  }
}
