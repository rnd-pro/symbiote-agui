import { finished } from 'node:stream/promises';
import { lstat } from 'node:fs/promises';
import { definitionPaths } from '../library/paths.js';
import { assetRoot, assertAssetRoot, openAssetFile, resolveAssetFile } from './files.js';
import { ASSET_LIMITS, ASSET_PATH } from './constants.js';
import { scanAssets } from './inventory.js';
import { assetContentType } from './paths.js';
import { assetStatus } from './status.js';
import { AssetHttpError, assetHttpError } from './http-errors.js';
import { readAssetRequest } from './http-request.js';
import { deliverAsset, verifyAssetFile } from './delivery.js';
import { hasErrorCode } from '../shared/system-error.js';
import { withAssetLock } from './lock.js';

export class LocalAssets {
  /** @type {import('../../types/assets.js').AssetRoot | undefined} */
  root;
  /** @type {Set<AbortController>} */
  active = new Set();
  /** @type {Set<Promise<void>>} */
  tasks = new Set();
  closing = false;
  invalidRoot = false;

  /**
   * @param {import('../../types/session.js').PageAccess} access
   * @param {string} directory
   * @param {import('../../types/assets.js').AssetHttpDependencies} [dependencies]
   */
  constructor(access, directory, dependencies = {}) {
    this.access = access;
    this.directory = directory;
    this.definition = definitionPaths(access.path.slice(1, -1)).htmlPath;
    this.prefix = `${access.path}${ASSET_PATH}/`;
    this.open = dependencies.open ?? openAssetFile;
    this.limits = {
      ...ASSET_LIMITS,
      ...dependencies.limits,
    };
  }

  async initialize() {
    try { this.root = await assetRoot(this.directory); }
    catch (error) { if (!hasErrorCode(error, 'ENOENT')) { this.invalidRoot = true; } }
  }

  status() {
    let status = assetStatus(this.access.path.slice(1, -1), !this.closing && !this.invalidRoot, this.directory, this.root);
    return this.invalidRoot ? {
      ...status,
      error: 'ASSET_ACCESS_DENIED',
    } : status;
  }

  /** @param {string | undefined} target */
  matches(target) {
    let path = target?.split('?')[0];
    return path === this.prefix.slice(0, -1) || !!path?.startsWith(this.prefix);
  }

  async close() {
    this.closing = true;
    for (let controller of this.active) { controller.abort(new AssetHttpError('STOPPED')); }
    await Promise.allSettled(Array.from(this.tasks));
  }

  /**
   * @param {AbortSignal} signal
   * @returns {Promise<import('../../types/assets.js').AssetRoot>}
   */
  async publishedRoot(signal) {
    if (this.invalidRoot) { throw new AssetHttpError('ACCESS_DENIED'); }
    let definition = await lstat(this.definition);
    if (!definition.isFile() || definition.isSymbolicLink()) { throw new AssetHttpError('NOT_FOUND'); }
    signal.throwIfAborted();
    if (this.root) { await assertAssetRoot(this.root); }
    let inventory = await scanAssets(this.directory, signal);
    if (!inventory.root) { throw new AssetHttpError('NOT_FOUND'); }
    this.root ??= inventory.root;
    await assertAssetRoot(this.root);
    if (inventory.entries.length > this.limits.files || inventory.totalBytes > this.limits.totalBytes
      || inventory.entries.length + inventory.directories.length > this.limits.entries) { throw new AssetHttpError('TOO_LARGE'); }
    return this.root;
  }

  /**
   * @param {import('node:http').IncomingMessage} request
   * @param {import('node:http').ServerResponse} response
   * @param {string} origin
   */
  serve(request, response, origin) {
    let task = this.run(request, response, origin);
    this.tasks.add(task);
    void task.then(() => this.tasks.delete(task), () => {
      this.tasks.delete(task);
      response.destroy();
    });
    return task;
  }

  /**
   * @param {import('node:http').IncomingMessage} request
   * @param {import('node:http').ServerResponse} response
   * @param {string} origin
   */
  async run(request, response, origin) {
    let controller = new AbortController();
    let signal = controller.signal;
    let disconnected = () => { if (!response.writableFinished) { controller.abort(); } };
    response.once('close', disconnected);
    let timer;
    /** @type {import('../../types/assets.js').AssetFile | undefined} */
    let file;
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; base-uri 'none'; form-action 'none'");
    try {
      if (this.closing) { throw new AssetHttpError('STOPPED'); }
      let name = readAssetRequest(request, origin, this.access, this.prefix);
      let contentType;
      try { contentType = assetContentType(name); }
      catch { throw new AssetHttpError('UNSUPPORTED_TYPE'); }
      if (this.active.size >= this.limits.concurrentRequests) { throw new AssetHttpError('BUSY'); }
      this.active.add(controller);
      timer = setTimeout(() => controller.abort(new AssetHttpError('TIMEOUT')), this.limits.timeoutMs);
      timer.unref();
      let root = await withAssetLock(this.access.path.slice(1, -1), async () => {
        let root = await this.publishedRoot(signal);
        let path = await resolveAssetFile(root, name);
        file = await this.open(path, signal);
        signal.throwIfAborted();
        if (file.info.size > this.limits.fileBytes) { throw new AssetHttpError('TOO_LARGE'); }
        await verifyAssetFile(file, root, name, signal);
        return root;
      }, signal);
      if (!file) { throw new AssetHttpError('FAILED'); }
      response.statusCode = 200;
      response.setHeader('Content-Type', contentType);
      response.setHeader('Content-Length', file.info.size);
      if (contentType === 'image/svg+xml') {
        response.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'");
      }
      if (request.method === 'HEAD') {
        response.end();
        await finished(response, {
          signal,
          cleanup: true,
        });
      } else { await deliverAsset(file, root, name, response, signal); }
    } catch (error) {
      if (response.destroyed) { return; }
      if (response.headersSent) { response.destroy(); return; }
      let failure = assetHttpError(signal.aborted && signal.reason instanceof AssetHttpError ? signal.reason : error);
      response.statusCode = failure.status;
      response.removeHeader('Content-Length');
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (failure.status === 405) { response.setHeader('Allow', 'GET, HEAD'); }
      if (failure.status === 429) { response.setHeader('Retry-After', '1'); }
      if (request.headers['transfer-encoding'] || request.headers['content-length']) { response.setHeader('Connection', 'close'); }
      response.end(JSON.stringify({
        error: {
          code: failure.code,
          message: failure.message,
        },
      }));
    } finally {
      clearTimeout(timer);
      try { await file?.handle.close(); }
      finally {
        this.active.delete(controller);
        response.off('close', disconnected);
      }
    }
  }
}
