import { isPageOrigin } from '../server/page-access.js';
import { finished } from 'node:stream/promises';
import { PROXY_LIMITS, PROXY_SOURCE_HEADER } from './constants.js';
import { proxyAllowsUrl } from './policy.js';
import { resolveAddresses, resolveDestination, sourceUrl } from './destination.js';
import { openProxyResponse } from './transport.js';
import { assetContentType, readProxyBody } from './body.js';
import { ProxyError } from './errors.js';

export class AssetProxy {
  /** @type {Map<AbortController, Set<string>>} */
  active = new Map();
  /** @type {Set<Promise<void>>} */
  tasks = new Set();
  /** @type {number[]} */
  recent = [];
  closing = false;

  /**
   * @param {import('../../types/session.js').PageAccess} access
   * @param {() => import('../../types/proxy.js').ProxyPolicy} getPolicy
   * @param {import('../../types/proxy.js').ProxyDependencies} [dependencies]
   */
  constructor(access, getPolicy, dependencies = {}) {
    this.access = access;
    this.getPolicy = getPolicy;
    this.resolve = dependencies.resolve || resolveAddresses;
    this.open = dependencies.open || openProxyResponse;
    this.limits = {
      ...PROXY_LIMITS,
      ...dependencies.limits,
    };
    this.now = dependencies.now || (() => performance.now());
  }

  refreshPolicy() {
    for (let [
      controller,
      targets,
    ] of this.active) {
      if ([
        ...targets,
      ].some((target) => !proxyAllowsUrl(this.getPolicy(), target))) {
        controller.abort(new ProxyError('SOURCE_DENIED'));
      }
    }
  }

  async close() {
    this.closing = true;
    for (let controller of this.active.keys()) { controller.abort(new ProxyError('STOPPED')); }
    await Promise.allSettled([
      ...this.tasks,
    ]);
  }

  /**
   * @param {import('node:http').IncomingMessage} request
   * @param {string} origin
   */
  readTarget(request, origin) {
    if (this.closing) { throw new ProxyError('STOPPED'); }
    if (![
      'GET',
      'HEAD',
    ].includes(request.method || '')) { throw new ProxyError('METHOD_DENIED'); }
    let {
      headers,
    } = request;
    if (headers['transfer-encoding'] || headers['content-length'] && headers['content-length'] !== '0') {
      throw new ProxyError('INVALID_REQUEST');
    }
    let hosts = [
      new URL(origin).host,
      ...(this.access.publicOrigin ? [
        new URL(this.access.publicOrigin).host,
      ] : []),
    ];
    if (!hosts.includes(headers.host || '') || headers.origin !== undefined && !isPageOrigin(headers.origin, origin, this.access)
      || headers['sec-fetch-site'] !== undefined && ![
        'same-origin',
        'none',
      ].includes(String(headers['sec-fetch-site']))) { throw new ProxyError('ORIGIN_DENIED'); }
    let url = new URL(request.url || '', origin);
    if (url.searchParams.getAll('url').length !== 1 || [
      ...url.searchParams.keys(),
    ].some((key) => key !== 'url')) {
      throw new ProxyError('INVALID_REQUEST');
    }
    return sourceUrl(url.searchParams.get('url') || '', this.getPolicy());
  }

  admit() {
    if (this.active.size >= this.limits.concurrentRequests) { throw new ProxyError('BUSY'); }
    let now = this.now();
    this.recent = this.recent.filter((time) => now - time < 60_000);
    if (this.recent.length >= this.limits.requestsPerMinute) { throw new ProxyError('RATE_LIMIT'); }
    this.recent.push(now);
  }

  /**
   * @param {URL} url
   * @param {string} method
   * @param {AbortController} controller
   * @param {Set<string>} targets
   */
  async retrieve(url, method, controller, targets) {
    let signal = controller.signal;
    for (let redirects = 0; ; redirects += 1) {
      url = sourceUrl(url.href, this.getPolicy());
      targets.add(url.href);
      let destination = await resolveDestination(url, signal, this.resolve);
      sourceUrl(url.href, this.getPolicy());
      let upstream = await this.open(destination, method, signal);
      try {
        signal.throwIfAborted();
        let status = upstream.statusCode || 502;
        if ([
          301,
          302,
          303,
          307,
          308,
        ].includes(status)) {
          if (redirects >= this.limits.redirects || !upstream.headers.location) { throw new ProxyError('REDIRECT_DENIED'); }
          let next;
          try { next = new URL(upstream.headers.location, url); }
          catch { throw new ProxyError('REDIRECT_DENIED'); }
          if (url.protocol === 'https:' && next.protocol === 'http:') { throw new ProxyError('REDIRECT_DENIED'); }
          url = next;
          continue;
        }
        if (status < 200 || status > 599 || status >= 300 && status < 400 && status !== 304 || status === 206) {
          throw new ProxyError('UPSTREAM_FAILED');
        }
        let empty = [
          204,
          205,
          304,
        ].includes(status);
        let contentType = empty ? undefined : assetContentType(upstream.headers['content-type']);
        let body = empty || method === 'HEAD' ? Buffer.alloc(0) : await readProxyBody(upstream, this.limits.bodyBytes, signal);
        signal.throwIfAborted();
        sourceUrl(url.href, this.getPolicy());
        return {
          status,
          contentType,
          body,
          source: url.href,
        };
      } finally { upstream.destroy(); }
    }
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
    let disconnected = () => { if (!response.writableFinished) { controller.abort(); } };
    response.once('close', disconnected);
    let timer;
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    try {
      let url = this.readTarget(request, origin);
      this.admit();
      let targets = new Set([
        url.href,
      ]);
      this.active.set(controller, targets);
      timer = setTimeout(() => controller.abort(new ProxyError('TIMEOUT')), this.limits.timeoutMs);
      timer.unref();
      let result = await this.retrieve(url, request.method || 'GET', controller, targets);
      response.statusCode = result.status;
      if (result.contentType) { response.setHeader('Content-Type', result.contentType); }
      response.setHeader(PROXY_SOURCE_HEADER, result.source);
      // Buffer at most one bounded asset per admitted request. This lets limit
      // and decoding failures return a clean error instead of a partial asset.
      response.end(result.body);
      await finished(response, {
        cleanup: true,
        signal: controller.signal,
      });
    } catch (error) {
      if (response.destroyed) { return; }
      if (response.headersSent) { response.destroy(); return; }
      let failure = controller.signal.aborted && controller.signal.reason instanceof ProxyError ? controller.signal.reason
        : error instanceof ProxyError ? error : new ProxyError('UPSTREAM_FAILED');
      response.statusCode = failure.status;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (failure.code === 'PROXY_METHOD_DENIED') { response.setHeader('Allow', 'GET, HEAD'); }
      if (failure.status === 429) { response.setHeader('Retry-After', '60'); }
      if (request.headers['transfer-encoding'] || request.headers['content-length']) { response.setHeader('Connection', 'close'); }
      response.end(JSON.stringify({
        error: {
          code: failure.code,
          message: failure.message,
        },
      }));
    } finally {
      clearTimeout(timer);
      this.active.delete(controller);
      response.off('close', disconnected);
    }
  }
}
