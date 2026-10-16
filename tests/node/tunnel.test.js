import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { cli, hasCliError } from '../browser/helpers.js';
import { temporaryState } from './state-fixture.js';
import { tunnelFixture } from './tunnel-fixture.js';
import { parseCommand } from '../../src/cli/parse.js';
import { verifyDownload } from '../../src/tunnel/binary.js';
import { readTunnelOrigin } from '../../src/tunnel/session-tunnel.js';
import { isProcessAlive, readSession } from '../../src/sessions/store.js';

test('tunnel options and verified download metadata reject invalid inputs', () => {
  assert.partialDeepStrictEqual(parseCommand(['start', 'desk', '--tunnel', '--no-open']), { tunnel: true, open: false });
  assert.partialDeepStrictEqual(parseCommand(['share', 'desk']), { command: 'share' });
  assert.throws(() => parseCommand(['share', 'desk', '--tunnel']));
  assert.throws(() => parseCommand(['status', 'desk', '--tunnel']));
  assert.equal(readTunnelOrigin('https://example.com'), undefined);
  assert.equal(readTunnelOrigin('https://api.trycloudflare.com'), undefined);
  assert.equal(readTunnelOrigin('URL: https://quiet-sky.trycloudflare.com'), 'https://quiet-sky.trycloudflare.com');
  let bytes = Buffer.from('official fixture');
  verifyDownload(bytes, createHash('sha256').update(bytes).digest('hex'));
  assert.throws(() => verifyDownload(bytes, '0'.repeat(64)), /checksum/);
});

test('sharing is idempotent, authorizes only configured origins, and stops its owned child', {
  skip: process.platform === 'win32' && 'The executable fixture uses a POSIX shebang.',
}, async (t) => {
  let state = await temporaryState();
  let fixture = await tunnelFixture(state.directory);
  let sessionId = 'shared';
  t.after(async () => {
    await cli('stop', sessionId).catch(() => {});
    fixture.close();
    await state.close();
  });
  let session = await cli('start', sessionId, '--tunnel', '--no-open');
  assert.equal(session.publicUrl, 'https://agui-test.trycloudflare.com/shared/');
  assert.equal(session.tunnel.state, 'ready');
  let token = new URL(session.publicAuthorizationUrl).hash.slice(1);
  let origin = new URL(session.publicUrl).origin;
  let endpoint = new URL('authorize', session.url);
  let request = { method: 'POST', headers: { Origin: origin, Authorization: `Bearer ${token}` } };
  let authorized = await fetch(endpoint, request);
  assert.equal(authorized.status, 204);
  let header = authorized.headers.get('set-cookie');
  assert.match(header || '', /HttpOnly; SameSite=Strict; Secure$/);
  let cookie = header?.split(';')[0] || '';
  assert.equal((await fetch(endpoint, { ...request, headers: { ...request.headers, Origin: 'https://attacker.example', 'X-Forwarded-Host': new URL(origin).host } })).status, 403);
  let socket = new WebSocket(new URL('socket', session.url).href.replace('http:', 'ws:'), { origin, headers: { Cookie: cookie } });
  let rendered = once(socket, 'message');
  await once(socket, 'open');
  let [data] = await rendered;
  let message = JSON.parse(data.toString());
  assert.equal(message.stylesheetUrl, '/styles.css.js');
  socket.send(JSON.stringify({ type: 'result', id: message.id }));
  assert.equal((await cli('pages', sessionId)).pages[0].url, session.publicUrl);
  let shares = await Promise.all([cli('share', sessionId), cli('share', sessionId)]);
  assert.equal(shares.every((reply) => reply.publicUrl === session.publicUrl), true);
  let [pid] = await fixture.pids();
  assert.equal((await fixture.pids()).length, 1);
  assert.equal(isProcessAlive(pid), true);
  let status = await cli('status', sessionId);
  assert.equal(status.publicAuthorizationUrl, undefined);
  assert.equal((await cli('status', sessionId, '--authorize')).publicAuthorizationUrl, session.publicAuthorizationUrl);
  assert.ok((await readSession(sessionId))?.controlUrl?.startsWith('http://127.0.0.1:'));
  socket.close();
  await once(socket, 'close');
  await cli('clear', sessionId);
  assert.equal(isProcessAlive(pid), true);
  await cli('stop-all');
  assert.equal(isProcessAlive(pid), false);
});

test('failed or exited tunnels leave the local session usable and can be recreated', {
  skip: process.platform === 'win32' && 'The executable fixture uses a POSIX shebang.',
}, async (t) => {
  let state = await temporaryState();
  let fixture = await tunnelFixture(state.directory);
  t.after(async () => {
    await cli('stop', 'retry').catch(() => {});
    fixture.close();
    await state.close();
  });
  await fixture.setMode('fail');
  await assert.rejects(cli('start', 'retry', '--tunnel', '--no-open'), (error) => hasCliError(error, 'TUNNEL_FAILED'));
  let status = await cli('status', 'retry');
  assert.equal(status.state, 'waiting');
  assert.equal(status.tunnel.state, 'failed');
  assert.equal(status.publicUrl, undefined);
  assert.equal(isProcessAlive((await fixture.pids())[0]), false);
  await fixture.setMode('usage');
  await assert.rejects(cli('share', 'retry'), (error) => {
    let failure = /** @type {Error & { stdout: string }} */ (error);
    let result = JSON.parse(failure.stdout);
    assert.equal(result.error.code, 'TUNNEL_FAILED');
    assert.match(result.error.message, /Incorrect Usage/);
    return true;
  });
  await fixture.setMode('ready');
  let shared = await cli('share', 'retry');
  let pids = await fixture.pids();
  let activePid = pids.at(-1);
  assert.ok(activePid);
  process.kill(activePid, 'SIGTERM');
  for (let attempt = 0; attempt < 30; attempt += 1) {
    status = await cli('status', 'retry');
    if (status.tunnel.state === 'failed') { break; }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.equal(status.publicUrl, undefined);
  assert.equal(status.tunnel.state, 'failed');
  let denied = await fetch(new URL('authorize', status.url), {
    method: 'POST',
    headers: { Origin: new URL(shared.publicUrl).origin, Authorization: `Bearer ${new URL(shared.publicAuthorizationUrl).hash.slice(1)}` },
  });
  assert.equal(denied.status, 403);
  assert.equal((await cli('share', 'retry')).tunnel.state, 'ready');
});

test('stop aborts a tunnel startup without leaving a child process', {
  skip: process.platform === 'win32' && 'The executable fixture uses a POSIX shebang.',
}, async (t) => {
  let state = await temporaryState();
  let fixture = await tunnelFixture(state.directory);
  t.after(async () => {
    await cli('stop', 'pending').catch(() => {});
    fixture.close();
    await state.close();
  });
  await fixture.setMode('wait');
  await cli('start', 'pending', '--no-open');
  let pending = assert.rejects(cli('share', 'pending'), (error) => hasCliError(error, 'TUNNEL_FAILED'));
  let pid;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { [pid] = await fixture.pids(); break; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.ok(pid);
  await cli('stop', 'pending');
  await pending;
  assert.equal(isProcessAlive(pid), false);
});
