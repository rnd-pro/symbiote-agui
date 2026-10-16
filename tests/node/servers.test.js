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
  let endpoint = new URL(access.authorizationPath, page.url);
  assert.equal((await fetch(endpoint)).status, 401);
  for (let [origin, token] of [[new URL(page.url).origin, 'wrong'], ['http://example.com', access.token]]) {
    let denied = await fetch(endpoint, { method: 'POST', headers: { Origin: origin, Authorization: `Bearer ${token}` } });
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get('set-cookie'), null);
  }
  let authorized = await fetch(endpoint, {
    method: 'POST',
    headers: { Origin: new URL(page.url).origin, Authorization: `Bearer ${access.token}` },
  });
  assert.equal(authorized.status, 204);
  assert.equal(authorized.headers.get('set-cookie'), `${access.cookieName}=${access.token}; Path=${access.path}; HttpOnly; SameSite=Strict`);
  let cookie = `${access.cookieName}=${access.token}`;
  assert.equal((await fetch(endpoint, { headers: { Cookie: cookie } })).status, 204);
  assert.equal((await fetch(endpoint, { headers: { Cookie: `${cookie}; ${cookie}` } })).status, 401);
  assert.equal((await fetch(endpoint, { headers: { Cookie: `agui-other=${access.token}` } })).status, 401);
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
