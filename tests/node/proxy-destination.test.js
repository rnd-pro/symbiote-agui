import assert from 'node:assert/strict';
import test from 'node:test';
import { Resolver } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { createServer } from 'node:http';
import { isPublicAddress } from '../../src/proxy/addresses.js';
import { resolveAddresses, resolveDestination, sourceUrl } from '../../src/proxy/destination.js';
import { openProxyResponse, proxyRequestOptions } from '../../src/proxy/transport.js';
import { closeServer, waitForServer } from '../../src/shared/server.js';

test('proxy excludes private, special, multicast, mapped, translated, and documentation address ranges', () => {
  for (let address of [
    '0.0.0.0',
    '10.1.2.3',
    '100.64.1.2',
    '127.2.3.4',
    '169.254.169.254',
    '172.31.2.3',
    '192.0.0.9',
    '192.0.2.7',
    '192.88.99.1',
    '192.168.1.2',
    '198.19.1.2',
    '198.51.100.2',
    '203.0.113.7',
    '224.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '64:ff9b::7f00:1',
    '2001::1',
    '2001:db8::1',
    '2002:7f00:1::1',
    '3fff::1',
    '5f00::1',
    'fc00::1',
    'fe80::1',
    'ff02::1',
    'not-an-address',
  ]) { assert.equal(isPublicAddress(address), false, address); }
  for (let address of [
    '8.8.8.8',
    '1.1.1.1',
    '93.184.215.14',
    '2001:4860:4860::8888',
    '2606:4700:4700::1111',
  ]) { assert.equal(isPublicAddress(address), true, address); }
});

test('destination checks validate both DNS families and reject alternate IP spellings without a network request', async () => {
  let signal = new AbortController().signal;
  for (let target of [
    'http://2130706433/',
    'http://0177.0.0.1/',
    'http://0x7f000001/',
    'http://[::ffff:127.0.0.1]/',
  ]) { await assert.rejects(resolveDestination(new URL(target), signal), {
    code: 'PROXY_DESTINATION_DENIED',
  }); }
  await assert.rejects(resolveDestination(new URL('https://assets.test/data'), signal, async () => [
    {
      address: '8.8.8.8',
      family: 4,
    },
    {
      address: '::1',
      family: 6,
    },
  ]), {
    code: 'PROXY_DESTINATION_DENIED',
  });
  let policy = {
    version: /** @type {const} */ (1),
    allowedOrigins: [
      'https://assets.test',
    ],
  };
  for (let target of [
    'file:///etc/passwd',
    'https://user:secret@assets.test/data',
    'https://assets.test/data#secret',
    'https://assets.test/\nprivate',
  ]) { assert.throws(() => sourceUrl(target, policy), {
    code: 'PROXY_INVALID_REQUEST',
  }); }
});

test('DNS resolution checks A and AAAA, treats absent records separately from failures, and cancels both on abort', async (t) => {
  t.mock.method(Resolver.prototype, 'resolve4', async () => [
    '8.8.8.8',
  ]);
  t.mock.method(Resolver.prototype, 'resolve6', async () => [
    '2606:4700:4700::1111',
  ]);
  assert.equal((await resolveAddresses('assets.test', new AbortController().signal)).length, 2);
  t.mock.method(Resolver.prototype, 'resolve6', async () => { throw Object.assign(new Error(), {
    code: 'ENODATA',
  }); });
  assert.equal((await resolveAddresses('assets.test', new AbortController().signal)).length, 1);
  t.mock.method(Resolver.prototype, 'resolve6', async () => { throw Object.assign(new Error(), {
    code: 'ESERVFAIL',
  }); });
  await assert.rejects(resolveAddresses('assets.test', new AbortController().signal), {
    code: 'PROXY_UPSTREAM_FAILED',
  });
  /** @type {((error: Error) => void)[]} */
  let rejectors = [];
  for (let method of /** @type {const} */ ([
    'resolve4',
    'resolve6',
  ])) { t.mock.method(Resolver.prototype, method, () => new Promise((_, reject) => rejectors.push(reject))); }
  let cancelled = 0;
  t.mock.method(Resolver.prototype, 'cancel', () => {
    cancelled += 1;
    for (let reject of rejectors) { reject(new Error('Cancelled')); }
  });
  let controller = new AbortController();
  let pending = resolveAddresses('assets.test', controller.signal);
  controller.abort(new Error('Stopped'));
  await assert.rejects(pending, /Stopped/);
  assert.equal(cancelled, 1);
  assert.equal(rejectors.length, 2);
});

test('transport pins validated DNS addresses, retains TLS hostname validation, and uses fresh credential-free requests', async (t) => {
  let controller = new AbortController();
  let destination = {
    url: new URL('https://assets.test/data'),
    address: {
      address: '93.184.215.14',
      family: 4,
    },
  };
  let options = proxyRequestOptions(destination, 'GET', controller.signal);
  assert.equal(options.agent, false);
  assert.equal(options.servername, 'assets.test');
  assert.equal(options.rejectUnauthorized, true);
  assert.equal(options.family, 4);
  assert.equal(options.signal, controller.signal);
  assert.ok(options.lookup);
  options.lookup('assets.test', {}, (error, address, family) => {
    assert.equal(error, null);
    assert.equal(address, destination.address.address);
    assert.equal(family, 4);
  });
  options.lookup('assets.test', {
    all: true,
  }, (error, addresses) => {
    assert.equal(error, null);
    assert.deepEqual(addresses, [
      destination.address,
    ]);
  });
  options.lookup('other.test', {}, (error) => assert.equal(error?.message, 'The source must resolve exclusively to public Internet addresses.'));
  assert.deepEqual(Object.keys(options.headers || {}).sort(), [
    'accept',
    'accept-encoding',
    'user-agent',
  ]);
  let received = '';
  let server = createServer((request, response) => {
    received = request.url || '';
    response.end('transport fixture');
  });
  server.listen(0, '127.0.0.1');
  let origin = await waitForServer(server);
  t.after(() => closeServer(server));
  let originalRequest = http.request;
  // Redirect only the test transport's physical socket. Production still sees a
  // public validated destination and never has a localhost exemption.
  /**
   * @param {URL} url
   * @param {import('node:https').RequestOptions} requestOptions
   * @param {(response: import('node:http').IncomingMessage) => void} callback
   */
  let routedRequest = (url, requestOptions, callback) => {
    assert.equal(url.href, destination.url.href);
    assert.equal(requestOptions.servername, 'assets.test');
    return originalRequest(new URL('/data', origin), {
      ...requestOptions,
      agent: false,
    }, callback);
  };
  t.mock.method(https, 'request', routedRequest);
  let response = await openProxyResponse(destination, 'GET', controller.signal);
  let chunks = [];
  for await (let chunk of response) { chunks.push(chunk); }
  assert.equal(Buffer.concat(chunks).toString(), 'transport fixture');
  assert.equal(received, '/data');
});

test('real HTTP transport rejects oversized headers and cancels requests waiting for response headers', async (t) => {
  let started = Promise.withResolvers();
  let server = createServer((request, response) => {
    if (request.url === '/large') {
      response.setHeader('X-Large', 'a'.repeat(20 * 1024));
      response.end();
    } else { started.resolve(undefined); }
  });
  server.listen(0, '127.0.0.1');
  let origin = await waitForServer(server);
  t.after(() => closeServer(server));
  let originalRequest = http.request;
  /**
   * @param {URL} url
   * @param {import('node:https').RequestOptions} options
   * @param {(response: import('node:http').IncomingMessage) => void} callback
   */
  let routedRequest = (url, options, callback) => originalRequest(new URL(url.pathname, origin), options, callback);
  t.mock.method(http, 'request', routedRequest);
  let destination = {
    url: new URL('http://assets.test/large'),
    address: {
      address: '8.8.8.8',
      family: 4,
    },
  };
  await assert.rejects(openProxyResponse(destination, 'GET', new AbortController().signal), {
    code: 'HPE_HEADER_OVERFLOW',
  });
  destination.url.pathname = '/wait';
  let controller = new AbortController();
  let pending = openProxyResponse(destination, 'GET', controller.signal);
  await started.promise;
  controller.abort();
  await assert.rejects(pending, {
    name: 'AbortError',
  });
});
