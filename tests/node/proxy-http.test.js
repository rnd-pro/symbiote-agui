import assert from 'node:assert/strict';
import { gzipSync, brotliCompressSync, deflateSync } from 'node:zlib';
import test from 'node:test';
import { proxyFixture, upstreamResponse, requestProxy } from './proxy-http-fixture.js';
import { startPageServer } from '../../src/server/page-server.js';
import { closeServer } from '../../src/shared/server.js';

test('proxy returns bounded decoded assets with safe headers, source metadata, HEAD semantics, and upstream errors', async (t) => {
  let method = '';
  let fixture = await proxyFixture(t, {
    open: async (_destination, incomingMethod) => {
      method = incomingMethod;
      return upstreamResponse(gzipSync('{"items":[1,2]}'), {
        'content-type': 'application/json; charset=utf-8',
        'content-encoding': 'gzip',
        'set-cookie': [
          'session=remote-secret',
        ],
        location: 'https://evil.test/',
        'access-control-allow-origin': '*',
        'content-security-policy': "script-src 'unsafe-inline'",
      });
    },
  });
  let response = await fetch(fixture.url(), {
    headers: {
      origin: fixture.origin,
      cookie: 'local=secret',
      authorization: 'Bearer local-secret',
      referer: 'https://private.test/',
    },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    items: [
      1,
      2,
    ],
  });
  assert.match(response.headers.get('content-type') || '', /application\/json/);
  assert.equal(response.headers.get('x-agui-source-url'), 'https://assets.test/data');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('content-security-policy') || '', /sandbox; default-src 'none'/);
  for (let header of [
    'set-cookie',
    'location',
    'access-control-allow-origin',
    'content-encoding',
  ]) { assert.equal(response.headers.get(header), null, header); }
  let head = await fetch(fixture.url(), {
    method: 'HEAD',
  });
  assert.equal(method, 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  fixture.proxy.open = async () => upstreamResponse('{"missing":true}', {
    'content-type': 'application/json',
  }, 404);
  let missing = await fetch(fixture.url());
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), {
    missing: true,
  });
});

test('proxy denies foreign origins, request bodies, non-read methods, malformed URLs, and disabled sources before opening a connection', async (t) => {
  let opened = 0;
  let fixture = await proxyFixture(t, {
    open: async () => { opened += 1; return upstreamResponse(); },
  });
  for (let options of /** @type {{ headers: Record<string, string> }[]} */ ([
    {
      headers: {
        origin: 'https://evil.test',
      },
    },
    {
      headers: {
        origin: 'null',
      },
    },
    {
      headers: {
        'sec-fetch-site': 'cross-site',
      },
    },
    {
      headers: {
        'sec-fetch-site': 'same-site',
      },
    },
    {
      headers: {
        host: 'evil.test',
      },
    },
  ])) { assert.equal((await requestProxy(fixture.url(), options)).status, 403, JSON.stringify(options)); }
  assert.equal((await requestProxy(fixture.url(), {
    headers: {
      'content-length': '4',
    },
    body: 'data',
  })).status, 400);
  let post = await fetch(fixture.url(), {
    method: 'POST',
    body: 'data',
  });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, HEAD');
  assert.equal((await fetch(fixture.url(), {
    method: 'OPTIONS',
  })).status, 405);
  let duplicate = fixture.url();
  duplicate.searchParams.append('url', 'https://next.test/data');
  assert.equal((await fetch(duplicate)).status, 400);
  let extra = fixture.url();
  extra.searchParams.set('headers', '{"cookie":"secret"}');
  assert.equal((await fetch(extra)).status, 400);
  for (let target of [
    'file:///private/document',
    'https://user:secret@assets.test/data',
    'https://assets.test/data#fragment',
  ]) { assert.equal((await fetch(fixture.url(target))).status, 400); }
  assert.equal((await fetch(fixture.url('https://blocked.test/data'))).status, 403);
  fixture.disable();
  assert.equal((await fetch(fixture.url())).status, 403);
  assert.equal(opened, 0);
});

test('redirects revalidate sources and DNS, resolve relative paths, and never forward an upstream redirect', async (t) => {
  /** @type {string[]} */
  let seen = [];
  let fixture = await proxyFixture(t, {
    open: async ({ url }) => {
      seen.push(url.href);
      return url.pathname === '/data' ? upstreamResponse('', {
        location: '/feed.xml',
      }, 302) : upstreamResponse('<rss/>', {
        'content-type': 'application/rss+xml',
      });
    },
  });
  let response = await fetch(fixture.url());
  assert.equal(await response.text(), '<rss/>');
  assert.equal(response.headers.get('x-agui-source-url'), 'https://assets.test/feed.xml');
  assert.equal(response.headers.get('location'), null);
  assert.equal(seen.length, 2);
  for (let location of [
    'https://blocked.test/data',
    'http://assets.test/data',
    'file:///private/file',
    'https://user:secret@next.test/data',
  ]) {
    fixture.proxy.open = async () => upstreamResponse('', {
      location,
    }, 307);
    let denied = await fetch(fixture.url());
    assert.ok(denied.status >= 400);
    assert.equal(denied.headers.get('location'), null);
  }
  let resolved = 0;
  let requests = 0;
  fixture.proxy.resolve = async () => [
    {
      address: ++resolved === 1 ? '8.8.8.8' : '127.0.0.1',
      family: 4,
    },
  ];
  fixture.proxy.open = async () => {
    requests += 1;
    return upstreamResponse('', {
      location: '/second',
    }, 302);
  };
  let rebound = await fetch(fixture.url());
  assert.equal(rebound.status, 403);
  assert.equal((await rebound.json()).error.code, 'PROXY_DESTINATION_DENIED');
  assert.equal(requests, 1);
  fixture.proxy.resolve = async () => [
    {
      address: '8.8.8.8',
      family: 4,
    },
  ];
  requests = 0;
  let loop = await fetch(fixture.url());
  assert.equal(loop.status, 502);
  assert.equal((await loop.json()).error.code, 'PROXY_REDIRECT_DENIED');
  assert.equal(requests, fixture.proxy.limits.redirects + 1);
});

test('response handling allows passive asset types and rejects executable types, invalid compression, and partial content', async (t) => {
  let fixture = await proxyFixture(t);
  for (let [
    type,
    bytes,
  ] of [
    [
      'text/markdown; charset=utf-8',
      Buffer.from('# Notes'),
    ],
    [
      'application/xml',
      Buffer.from('<feed/>'),
    ],
    [
      'image/png',
      Buffer.from('89504e470d0a1a0a', 'hex'),
    ],
  ]) {
    fixture.proxy.open = async () => upstreamResponse(bytes, {
      'content-type': String(type),
    });
    let response = await fetch(fixture.url());
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  }
  for (let type of [
    'text/html',
    'text/javascript',
    'application/xhtml+xml',
    'image/svg+xml',
    'text/css',
    '',
  ]) {
    fixture.proxy.open = async () => upstreamResponse('<script>bad()</script>', {
      'content-type': type,
    });
    assert.equal((await fetch(fixture.url())).status, 415);
  }
  for (let [
    encoding,
    compress,
  ] of Object.entries({
    deflate: deflateSync,
    br: brotliCompressSync,
  })) {
    fixture.proxy.open = async () => upstreamResponse(compress(Buffer.from('decoded')), {
      'content-type': 'text/plain',
      'content-encoding': encoding,
    });
    assert.equal(await (await fetch(fixture.url())).text(), 'decoded');
  }
  for (let encoding of [
    'gzip',
    'gzip, br',
    'unrecognized',
  ]) {
    fixture.proxy.open = async () => upstreamResponse('broken compression', {
      'content-type': 'text/plain',
      'content-encoding': encoding,
    });
    assert.equal((await fetch(fixture.url())).status, 502);
  }
  fixture.proxy.open = async () => upstreamResponse('', {}, 204);
  assert.equal((await fetch(fixture.url())).status, 204);
  fixture.proxy.open = async () => upstreamResponse('partial', {
    'content-type': 'text/plain',
  }, 206);
  assert.equal((await fetch(fixture.url())).status, 502);
});

test('page server scopes the proxy to its session and tracks local/public origin changes and policy updates', async (t) => {
  let access = {
    path: '/desk/',
    socketPath: '/desk/socket',
    publicOrigin: 'https://first.test',
  };
  let policy = {
    version: /** @type {const} */ (1),
    allowedOrigins: [
      'https://assets.test',
    ],
  };
  let page = await startPageServer(access, () => policy, {
    resolve: async () => [
      {
        address: '8.8.8.8',
        family: 4,
      },
    ],
    open: async () => upstreamResponse(),
  });
  t.after(() => closeServer(page.server));
  let endpoint = new URL('_proxy?url=https://assets.test/data', page.url);
  assert.equal((await fetch(endpoint)).status, 200);
  assert.equal((await fetch(new URL('/other/_proxy?url=https://assets.test/data', endpoint))).status, 404);
  assert.equal((await fetch(new URL('/_proxy?url=https://assets.test/data', endpoint))).status, 404);
  assert.equal((await fetch(endpoint, {
    headers: {
      origin: access.publicOrigin,
      host: 'first.test',
    },
  })).status, 200);
  access.publicOrigin = 'https://second.test';
  assert.equal((await fetch(endpoint, {
    headers: {
      origin: 'https://first.test',
    },
  })).status, 403);
  policy.allowedOrigins = [];
  page.proxy.refreshPolicy();
  assert.equal((await fetch(endpoint)).status, 403);
});
