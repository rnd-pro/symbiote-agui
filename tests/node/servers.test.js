import assert from 'node:assert/strict';
import test from 'node:test';
import { startControlServer } from '../../src/server/control-server.js';
import { startPageServer } from '../../src/server/page-server.js';
import { closeServer } from '../../src/shared/server.js';
import { requestSession } from '../../src/sessions/client.js';
import { reserveSession } from '../../src/sessions/store.js';
import { temporaryState } from './state-fixture.js';
import { MAX_HTML_BYTES } from '../../src/markup/constants.js';

test('JSDA serves the page on loopback without exposing source files', async (t) => {
  let page = await startPageServer();
  t.after(() => closeServer(page.server));
  let response = await fetch(page.url);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<main id="agui-content">/);
  assert.equal((await fetch(new URL('/shell.html', page.url))).status, 404);
  assert.equal((await fetch(new URL('/../../package.json', page.url))).status, 404);
  let stylesheet = await fetch(new URL('/styles.css.js', page.url));
  assert.equal(stylesheet.status, 200);
  assert.match(stylesheet.headers.get('content-type') || '', /text\/css/);
  assert.match(await stylesheet.text(), /@layer/);
  assert.equal(stylesheet.headers.get('cache-control'), 'no-store');
});

test('markup control errors retain worker identity and reject oversized bodies', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let record = await reserveSession('markup', { mode: 'managed', channel: 'chrome' });
  let received = '';
  let control = await startControlServer(record,
    () => ({ sessionId: record.sessionId, state: 'ready' }),
    async () => {},
    async (html) => {
      received = html;
      return { sessionId: record.sessionId, state: 'ready' };
    });
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
  let record = await reserveSession('control', { mode: 'managed', channel: 'chrome' });
  let stopped = false;
  let control = await startControlServer(record,
    () => ({ sessionId: record.sessionId, state: 'disconnected' }),
    async () => { stopped = true; });
  t.after(() => closeServer(control.server));
  record.controlUrl = control.url;
  let unauthorized = await fetch(`${control.url}/status`);
  assert.equal(unauthorized.status, 401);
  assert.equal(await unauthorized.text(), '');
  assert.deepEqual(await requestSession(record, 'status'), { sessionId: 'control', state: 'disconnected' });
  await assert.rejects(requestSession({ ...record, pid: record.pid + 1 }, 'status'), { code: 'SESSION_UNREACHABLE' });
  assert.equal((await requestSession(record, 'stop')).state, 'stopped');
  assert.equal(stopped, true);
});
