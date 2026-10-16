import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, chmod, mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { getStateRoot } from '../sessions/store.js';
import { hasErrorCode } from '../shared/system-error.js';
import { CLOUDFLARED_ASSETS, CLOUDFLARED_VERSION, MAX_DOWNLOAD_BYTES } from './constants.js';

let execute = promisify(execFile);

/**
 * @param {Uint8Array} bytes
 * @param {string} expected
 */
export function verifyDownload(bytes, expected) {
  if (createHash('sha256').update(bytes).digest('hex') !== expected) {
    throw new Error('The cloudflared download checksum did not match. The binary was not installed.');
  }
}

/**
 * @param {string} url
 * @param {AbortSignal} signal
 */
async function download(url, signal) {
  let response = await fetch(url, { signal });
  if (!response.ok || !response.body) { throw new Error(`cloudflared download failed: HTTP ${response.status}.`); }
  /** @type {Uint8Array[]} */
  let chunks = [];
  let size = 0;
  for await (let chunk of response.body) {
    size += chunk.byteLength;
    if (size > MAX_DOWNLOAD_BYTES) { throw new Error('The cloudflared download is too large.'); }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** @param {AbortSignal} signal */
export async function getCloudflared(signal) {
  let configured = process.env.AGUI_CLOUDFLARED_PATH;
  if (configured) {
    let path = resolve(configured);
    await access(path, constants.X_OK);
    return path;
  }
  try {
    await execute('cloudflared', ['--version'], { signal, timeout: 5_000, windowsHide: true });
    return 'cloudflared';
  } catch (error) {
    if (!hasErrorCode(error, 'ENOENT')) { throw error; }
  }
  return installCloudflared(signal);
}

/** @param {AbortSignal} signal */
export async function installCloudflared(signal) {
  let platform = `${process.platform}-${process.arch}`;
  let asset = CLOUDFLARED_ASSETS[/** @type {keyof typeof CLOUDFLARED_ASSETS} */ (platform)];
  if (!asset) { throw new Error(`Install cloudflared or set AGUI_CLOUDFLARED_PATH for ${platform}.`); }
  let directory = join(getStateRoot(), '.bin', 'cloudflared', CLOUDFLARED_VERSION, platform);
  let executable = process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';
  let path = join(directory, executable);
  try { await access(path, constants.X_OK); return path; }
  catch (error) { if (!hasErrorCode(error, 'ENOENT')) { throw error; } }
  await mkdir(directory, { recursive: true, mode: 0o700 });
  let temporary = await mkdtemp(join(directory, '.install-'));
  try {
    let bytes = await download(`https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/${asset.name}`, signal);
    verifyDownload(bytes, asset.sha256);
    let archive = join(temporary, asset.name);
    await writeFile(archive, bytes, { mode: 0o600 });
    let binary = archive;
    if (asset.name.endsWith('.tgz')) {
      await execute('tar', ['-xzf', archive, '-C', temporary, 'cloudflared'], { signal, timeout: 10_000 });
      binary = join(temporary, executable);
    }
    await chmod(binary, 0o700);
    signal.throwIfAborted();
    try { await rename(binary, path); }
    catch (error) {
      if (!['EEXIST', 'EPERM'].some((code) => hasErrorCode(error, code))) { throw error; }
      await access(path, constants.X_OK);
    }
    return path;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
