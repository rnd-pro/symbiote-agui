import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { assertAssetFileUnchanged, assertAssetRoot, resolveAssetFile, sameAssetFile } from './files.js';
import { AssetHttpError } from './http-errors.js';

/**
 * @param {import('../../types/assets.js').AssetFile} file
 * @param {import('../../types/assets.js').AssetRoot} root
 * @param {string} name
 * @param {AbortSignal} signal
 */
export async function verifyAssetFile(file, root, name, signal) {
  signal.throwIfAborted();
  await assertAssetRoot(root);
  let path = await resolveAssetFile(root, name);
  await assertAssetFileUnchanged(path, file.info);
  if (!sameAssetFile(file.info, await file.handle.stat())) { throw new AssetHttpError('CHANGED'); }
  signal.throwIfAborted();
}

/**
 * Stream a captured byte range, checking its identity before releasing the final chunk.
 * @param {import('../../types/assets.js').AssetFile} file
 * @param {import('../../types/assets.js').AssetRoot} root
 * @param {string} name
 * @param {import('node:http').ServerResponse} response
 * @param {AbortSignal} signal
 */
export async function deliverAsset(file, root, name, response, signal) {
  async function* chunks() {
    let offset = 0;
    if (!file.info.size) { await verifyAssetFile(file, root, name, signal); }
    while (offset < file.info.size) {
      signal.throwIfAborted();
      let buffer = Buffer.alloc(Math.min(64 * 1024, file.info.size - offset));
      let read = await file.handle.read(buffer, 0, buffer.length, offset);
      if (!read.bytesRead) { throw new AssetHttpError('CHANGED'); }
      offset += read.bytesRead;
      if (offset === file.info.size) { await verifyAssetFile(file, root, name, signal); }
      signal.throwIfAborted();
      yield buffer.subarray(0, read.bytesRead);
    }
  }
  let source = chunks();
  // Read the first chunk before pipeline owns the response, preserving a JSON
  // failure when opening/reading fails before any bytes have been sent.
  let first = await source.next();
  async function* ready() {
    if (!first.done) { yield first.value; }
    yield* source;
  }
  await pipeline(Readable.from(ready()), response, {
    signal,
  });
}
