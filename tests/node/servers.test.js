import assert from 'node:assert/strict';
import test from 'node:test';
import { startControlServer } from '../../src/server/control-server.js';
import { startPageServer } from '../../src/server/page-server.js';
import { closeServer } from '../../src/shared/server.js';
import { requestSession } from '../../src/sessions/client.js';
import { reserveSession } from '../../src/sessions/store.js';
import { temporaryState } from './state-fixture.js';
import { MAX_HTML_BYTES } from '../../src/markup/constants.js';
import { createPageAccess } from '../../src/server/page-access.js';
import { checkTunnelActivity } from '../../src/tunnel/activity.js';

test('JSDA serves the page on loopback without exposing source files', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let access = createPageAccess(await reserveSession('readable-page'));
  let page = await startPageServer(access);
  t.after(() => closeServer(page.server));
  assert.equal(new URL(page.url).pathname, '/readable-page/');
  let response = await fetch(page.url);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<main id="agui-content">/);
  assert.equal((await fetch(new URL('/', page.url))).status, 404);
  assert.equal((await fetch(new URL('/other/', page.url))).status, 404);
  let redirect = await fetch(page.url.slice(0, -1), { redirect: 'manual' });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), access.path);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal((await fetch(new URL('authorize', page.url))).status, 404);
  assert.equal((await fetch(new URL('/shell.html', page.url))).status, 404);
  assert.equal((await fetch(new URL('/../../package.json', page.url))).status, 404);
  let stylesheet = await fetch(new URL('/styles.css.js', page.url));
  assert.equal(stylesheet.status, 200);
  assert.match(stylesheet.headers.get('content-type') || '', /text\/css/);
  assert.match(await stylesheet.text(), /@layer/);
  assert.equal(stylesheet.headers.get('cache-control'), 'no-store');
  let client = await fetch(new URL('/client/index.js', page.url));
  assert.equal(client.status, 200);
  assert.match(client.headers.get('content-type') || '', /javascript/);
  assert.match(await client.text(), /replaceContent/);
  assert.equal((await fetch(new URL('/client/component.js', page.url))).status, 404);
  let health = await fetch(new URL('tunnel-health?nonce=unique-check', page.url));
  assert.equal(health.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await health.json(), { sessionId: 'readable-page', nonce: 'unique-check' });
  assert.equal((await fetch(new URL('tunnel-health', page.url))).status, 400);
  assert.equal((await fetch(new URL('/other/tunnel-health?nonce=check', page.url))).status, 404);
  let checked = await checkTunnelActivity({ sessionId: 'readable-page', state: 'waiting', publicUrl: page.url, tunnel: { state: 'ready' } });
  assert.equal(checked.tunnel?.active, true);
  assert.ok(checked.tunnel?.checkedAt);
});

test('markup control errors retain worker identity and reject oversized bodies', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let record = await reserveSession('markup');
  let received = '';
  let control = await startControlServer(record,
    () => ({ sessionId: record.sessionId, state: 'ready' }),
    async () => {},
    { insert: async (html) => {
      received = html;
      return { sessionId: record.sessionId, state: 'ready' };
    } });
  t.after(() => closeServer(control.server));
  record.controlUrl = control.url;
  assert.equal((await requestSession(record, 'insert', 2_000, '<p>hello</p>')).state, 'ready');
  assert.equal(received, '<p>hello</p>');
  await assert.rejects(requestSession(record, 'insert', 2_000, 'x'.repeat(MAX_HTML_BYTES + 1)), { code: 'INPUT_TOO_LARGE', exitCode: 2 });
  assert.equal(received, '<p>hello</p>');
});

test('control requires authentication, verifies identity, and acknowledges cleanup', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let record = await reserveSession('control');
  let stopped = false;
  let control = await startControlServer(record,
    () => ({ sessionId: record.sessionId, state: 'waiting' }),
    async () => { stopped = true; });
  t.after(() => closeServer(control.server));
  record.controlUrl = control.url;
  let unauthorized = await fetch(`${control.url}/status`);
  assert.equal(unauthorized.status, 401);
  assert.equal(await unauthorized.text(), '');
  assert.deepEqual(await requestSession(record, 'status'), { sessionId: 'control', state: 'waiting' });
  await assert.rejects(requestSession({ ...record, pid: record.pid + 1 }, 'status'), { code: 'SESSION_UNREACHABLE' });
  assert.equal((await requestSession(record, 'stop')).state, 'stopped');
  assert.equal(stopped, true);
});
