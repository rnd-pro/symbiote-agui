import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { openSessionPublicLink } from '../../src/sessions/tunnel.js';
import { waitForTunnelActivity } from '../../src/tunnel/activity.js';
import { TUNNEL_READY_TIMEOUT_MS } from '../../src/tunnel/constants.js';

/**
 * @param {string} host
 * @param {number} [age]
 * @returns {import('../../types/session.js').SessionStatus}
 */
function status(host, age = 0) {
  return {
    sessionId: 'desk',
    state: 'waiting',
    publicUrl: `https://${host}.trycloudflare.com/desk/`,
    tunnel: {
      state: 'ready',
      readyAt: new Date(Date.now() - age).toISOString(),
    },
  };
}

/** @param {URL} url */
function healthy(url) {
  return Response.json({
    sessionId: 'desk',
    nonce: url.searchParams.get('nonce'),
  });
}

/**
 * @param {import('node:test').TestContext} t
 * @param {() => import('../../types/session.js').SessionStatus} current
 * @param {() => import('../../types/session.js').SessionStatus} renew
 * @param {(url: URL) => Response} probe
 */
function worker(t, current, renew, probe) {
  let record = {
    sessionId: 'desk',
    instanceId: randomUUID(),
    controlToken: 'a'.repeat(64),
    controlUrl: 'http://127.0.0.1:1',
    pid: process.pid,
    launcherPid: process.pid,
  };
  t.mock.method(globalThis, 'fetch', async (/** @type {string | URL | Request} */ input) => {
    let url = new URL(input instanceof Request ? input.url : input);
    if (url.hostname !== '127.0.0.1') { return probe(url); }
    let result = url.pathname === '/tunnel-renew' ? renew() : current();
    return Response.json({
      instanceId: record.instanceId,
      pid: record.pid,
      result,
    });
  });
  return record;
}

test('fresh Public opening waits through DNS failures on the same URL without renewing it', {
  timeout: 10_000,
}, async (t) => {
  let current = status('fresh');
  let renewals = 0;
  let probes = 0;
  let record = worker(t, () => current, () => { renewals += 1; return current; }, (url) => {
    probes += 1;
    assert.equal(url.hostname, 'fresh.trycloudflare.com');
    if (probes < 3) { throw new TypeError('fetch failed', {
      cause: new Error('getaddrinfo ENOTFOUND fresh.trycloudflare.com'),
    }); }
    return healthy(url);
  });
  let opened = await openSessionPublicLink(record);
  assert.equal(opened.url, current.publicUrl);
  assert.equal(renewals, 0);
  assert.equal(opened.status.tunnel?.active, true);
  assert.equal(opened.status.tunnel?.checkError, undefined, 'A recovered probe must clear its earlier DNS error.');
});

test('renewal is performed once and its URL survives transient routing and DNS failures before Viewer opens', {
  timeout: 10_000,
}, async (t) => {
  let previous = status('expired', TUNNEL_READY_TIMEOUT_MS + 1);
  let replacement = status('replacement');
  let renewals = 0;
  let probes = 0;
  let record = worker(t, () => previous, () => { renewals += 1; return replacement; }, (url) => {
    if (url.hostname === 'expired.trycloudflare.com') { return new Response('', {
      status: 503,
    }); }
    probes += 1;
    if (probes === 1) { return new Response('', {
      status: 502,
    }); }
    if (probes === 2) { throw new TypeError('fetch failed'); }
    return healthy(url);
  });
  let opened = await openSessionPublicLink(record, true);
  assert.equal(opened.url, `${replacement.publicUrl}?mode=viewer`);
  assert.equal(renewals, 1);
  assert.equal(opened.status.tunnel?.active, true);
});

test('a concurrent renewal discovered after a failed probe is verified without replacing it again', {
  timeout: 10_000,
}, async (t) => {
  let current = status('previous', TUNNEL_READY_TIMEOUT_MS + 1);
  let replacement = status('concurrent');
  let renewals = 0;
  let record = worker(t, () => current, () => { renewals += 1; return replacement; }, (url) => {
    if (url.hostname === 'previous.trycloudflare.com') {
      current = replacement;
      return new Response('', {
        status: 503,
      });
    }
    return healthy(url);
  });
  let opened = await openSessionPublicLink(record);
  assert.equal(opened.url, replacement.publicUrl);
  assert.equal(renewals, 0);
});

test('readiness expiry preserves a fresh tunnel and reports the DNS cause instead of renewing in a loop', async (t) => {
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  let current = status('not-yet-reachable');
  let renewals = 0;
  let record = worker(t, () => current, () => { renewals += 1; return current; }, () => {
    now += TUNNEL_READY_TIMEOUT_MS + 1;
    throw new TypeError('fetch failed', {
      cause: new Error('getaddrinfo ENOTFOUND not-yet-reachable.trycloudflare.com'),
    });
  });
  await assert.rejects(openSessionPublicLink(record), /ENOTFOUND.*current tunnel has been kept/);
  assert.equal(renewals, 0);
});

test('a readiness deadline bounds repeated checks and does not recreate the URL', {
  timeout: 2_000,
}, async (t) => {
  let current = status('unavailable');
  let urls = new Set();
  t.mock.method(globalThis, 'fetch', async (/** @type {string | URL | Request} */ input) => {
    let url = new URL(input instanceof Request ? input.url : input);
    urls.add(url.origin);
    throw new TypeError('fetch failed');
  });
  let checked = await waitForTunnelActivity(current, 20);
  assert.equal(checked.tunnel?.active, false);
  assert.deepEqual(Array.from(urls), [
    new URL(current.publicUrl || '').origin,
  ]);
});
