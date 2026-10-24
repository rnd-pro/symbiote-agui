import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import { extname } from 'node:path';
import { CommandError } from '../../shared/command-error.js';
import { explorerRoot, resolveExplorerPath } from './access.js';
import { EXPLORER_PREVIEW_BYTES } from './constants.js';
import { MARKDOWN_LIMITS } from '../../page/client/uilib/widgets/markdown/constants.js';

let textExtensions = new Set([
  '.txt',
  '.md',
  '.markdown',
  '.json',
  '.jsonl',
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.html',
  '.htm',
  '.css',
  '.scss',
  '.svg',
  '.yaml',
  '.yml',
  '.toml',
  '.xml',
  '.csv',
  '.sql',
  '.sh',
  '.py',
  '.go',
  '.rs',
  '.svelte',
  '.vue',
  '.log',
  '.ini',
  '.conf',
]);

/**
 * @param {string} projectId
 * @param {string} path
 * @param {boolean} [showHidden]
 * @returns {Promise<import('../../../types/explorer.js').ProjectPreview>}
 */
export async function previewProjectFile(projectId, path, showHidden = false) {
  if (!path) { throw new CommandError('Choose a project file to preview.'); }
  let scope = await explorerRoot(projectId);
  let resolved = await resolveExplorerPath(scope, path, showHidden);
  let before = await lstat(resolved);
  if (!before.isFile()) { throw new CommandError('Only regular project files can be previewed.'); }
  let handle = await open(resolved, constants.O_RDONLY | (constants.O_NOFOLLOW || 0) | (constants.O_NONBLOCK || 0));
  try {
    let info = await handle.stat();
    if (!info.isFile() || info.dev !== before.dev || info.ino !== before.ino
      || await resolveExplorerPath(scope, path, showHidden) !== resolved) { throw new CommandError('The file changed while opening. Refresh to retry.'); }
    let result = {
      projectId,
      path,
      size: info.size,
    };
    let extension = extname(path).toLowerCase();
    let markdown = extension === '.md' || extension === '.markdown';
    let limit = markdown ? Math.min(EXPLORER_PREVIEW_BYTES, MARKDOWN_LIMITS.inputBytes) : EXPLORER_PREVIEW_BYTES;
    if (info.size > limit) {
      return {
        ...result,
        kind: 'too-large',
        message: `This file exceeds the ${limit / 1024} KiB preview limit. Open its folder to inspect it locally.`,
      };
    }
    if (extension && !textExtensions.has(extension)) {
      return {
        ...result,
        kind: 'unsupported',
        message: 'Preview is available for text, source, JSON, and Markdown files. Open the folder to inspect this file locally.',
      };
    }
    let buffer = Buffer.alloc(limit + 1);
    let length = 0;
    while (length < buffer.length) {
      let read = await handle.read(buffer, length, buffer.length - length, length);
      if (!read.bytesRead) { break; }
      length += read.bytesRead;
    }
    if (length > limit) { throw new CommandError('The file grew beyond the preview limit. Refresh to retry.'); }
    let text;
    try {
      text = new TextDecoder('utf-8', {
        fatal: true,
      }).decode(buffer.subarray(0, length));
      if (/\x00/.test(text)) { throw new Error('Binary content.'); }
    } catch {
      return {
        ...result,
        kind: 'unsupported',
        message: 'This file is not UTF-8 text. Open its folder to inspect it locally.',
      };
    }
    return {
      ...result,
      kind: markdown ? 'markdown' : 'text',
      text,
    };
  } finally { await handle.close(); }
}
