import assert from 'node:assert/strict';
import test from 'node:test';
import { startControlServer } from '../../src/server/control-server.js';
import { startPageServer } from '../../src/server/page-server.js';
import { closeServer } from '../../src/shared/server.js';
import { requestSession } from '../../src/sessions/client.js';
import { reserveSession } from '../../src/sessions/store.js';
import { temporaryState } from './state-fixture.js';

test('JSDA serves the page on loopback without exposing source files', async (t) => {
  let page = await startPageServer();
  t.after(() => closeServer(page.server));
  let response = await fetch(page.url);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<main id="agui-content">/);
  assert.equal((await fetch(new URL('/shell.html', page.url))).status, 404);
  assert.equal((await fetch(new URL('/../../package.json', page.url))).status, 404);
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
