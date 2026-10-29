import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { proxyFixture, upstreamResponse, waitForAbort } from './proxy-http-fixture.js';

test('proxy enforces advertised, streamed wire, and decompressed body limits without returning a partial asset', async (t) => {
  let fixture = await proxyFixture(t, {
    limits: {
      bodyBytes: 64,
    },
  });
  for (let response of [
    upstreamResponse('small', {
      'content-type': 'text/plain',
      'content-length': '65',
    }),
    upstreamResponse([
      Buffer.alloc(32, 'a'),
      Buffer.alloc(33, 'b'),
    ]),
    upstreamResponse(gzipSync(Buffer.alloc(200, 'c')), {
      'content-type': 'text/plain',
      'content-encoding': 'gzip',
    }),
    upstreamResponse(gzipSync(Buffer.from(Array.from({
      length: 64,
    }, (_, i) => i))), {
      'content-type': 'text/plain',
      'content-encoding': 'gzip',
    }),
  ]) {
    fixture.proxy.open = async () => response;
    let result = await fetch(fixture.url());
    assert.equal(result.status, 413);
    assert.equal((await result.json()).error.code, 'PROXY_TOO_LARGE');
    assert.equal(response.destroyed, true);
    assert.equal(result.headers.get('x-agui-source-url'), null);
  }
});

test('one deadline bounds DNS, response headers, body reads, and the entire redirect chain', async (t) => {
  let dns = await proxyFixture(t, {
    limits: {
      timeoutMs: 30,
    },
    resolve: async (_host, signal) => waitForAbort(signal),
  });
  assert.equal((await fetch(dns.url())).status, 504);
  let headers = await proxyFixture(t, {
    limits: {
      timeoutMs: 30,
    },
    open: async (_target, _method, signal) => waitForAbort(signal),
  });
  let timedOut = await fetch(headers.url());
  assert.equal(timedOut.status, 504);
  assert.equal((await timedOut.json()).error.code, 'PROXY_TIMEOUT');
  let hanging = upstreamResponse('start', undefined, 200, false);
  let body = await proxyFixture(t, {
    limits: {
      timeoutMs: 30,
    },
    open: async () => hanging,
  });
  assert.equal((await fetch(body.url())).status, 504);
  assert.equal(hanging.destroyed, true);
  let chain = await proxyFixture(t, {
    limits: {
      timeoutMs: 45,
      redirects: 20,
    },
    open: async (_target, _method, signal) => {
      await delay(20, undefined, {
        signal,
      });
      return upstreamResponse('', {
        location: '/next',
      }, 302);
    },
  });
  assert.equal((await fetch(chain.url())).status, 504);
});

test('proxy bounds concurrent work and applies a rolling per-session rate limit', async (t) => {
  let started = Promise.withResolvers();
  let release = Promise.withResolvers();
  let fixture = await proxyFixture(t, {
    limits: {
      concurrentRequests: 1,
    },
    open: async (_target, _method, signal) => {
      started.resolve(undefined);
      await Promise.race([
        release.promise,
        waitForAbort(signal),
      ]);
      return upstreamResponse();
    },
  });
  let first = fetch(fixture.url());
  await started.promise;
  let busy = await fetch(fixture.url());
  assert.equal(busy.status, 429);
  assert.equal((await busy.json()).error.code, 'PROXY_BUSY');
  release.resolve(undefined);
  assert.equal((await first).status, 200);
  let time = 0;
  let rate = await proxyFixture(t, {
    limits: {
      requestsPerMinute: 2,
    },
    now: () => time,
  });
  assert.equal((await fetch(rate.url())).status, 200);
  assert.equal((await fetch(rate.url())).status, 200);
  let limited = await fetch(rate.url());
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).error.code, 'PROXY_RATE_LIMIT');
  time = 60_000;
  assert.equal((await fetch(rate.url())).status, 200);
});

test('disconnecting a browser cancels its upstream request and frees the active slot', async (t) => {
  let started = Promise.withResolvers();
  let cancelled = Promise.withResolvers();
  let fixture = await proxyFixture(t, {
    open: async (_target, _method, signal) => {
      signal.addEventListener('abort', () => cancelled.resolve(undefined), {
        once: true,
      });
      started.resolve(undefined);
      return waitForAbort(signal);
    },
  });
  let controller = new AbortController();
  let pending = fetch(fixture.url(), {
    signal: controller.signal,
  });
  await started.promise;
  controller.abort();
  await assert.rejects(pending);
  await cancelled.promise;
  await fixture.proxy.close();
  assert.equal(fixture.proxy.active.size, 0);
  assert.equal(fixture.proxy.tasks.size, 0);
});

test('policy revocation and shutdown cancel admitted DNS and body work and return sanitized failures', async (t) => {
  let started = Promise.withResolvers();
  let fixture = await proxyFixture(t, {
    resolve: async (_host, signal) => {
      started.resolve(undefined);
      return waitForAbort(signal);
    },
  });
  let pending = fetch(fixture.url());
  await started.promise;
  fixture.disable();
  let denied = await pending;
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).error.code, 'PROXY_SOURCE_DENIED');
  let opened = Promise.withResolvers();
  let hanging = upstreamResponse('', undefined, 200, false);
  let stopping = await proxyFixture(t, {
    open: async () => {
      opened.resolve(undefined);
      return hanging;
    },
  });
  let reading = fetch(stopping.url());
  await opened.promise;
  await stopping.proxy.close();
  let stopped = await reading;
  assert.equal(stopped.status, 503);
  assert.equal((await stopped.json()).error.code, 'PROXY_STOPPED');
  assert.equal(hanging.destroyed, true);
  assert.equal(stopping.proxy.active.size, 0);
  assert.equal((await fetch(stopping.url())).status, 503);
  let failed = await proxyFixture(t, {
    open: async () => { throw new Error('Host /private/secret with token=do-not-leak'); },
  });
  let failure = await fetch(failed.url());
  assert.equal(failure.status, 502);
  let message = await failure.text();
  assert.doesNotMatch(message, /secret|token|private/);
  assert.match(message, /PROXY_UPSTREAM_FAILED/);
});
