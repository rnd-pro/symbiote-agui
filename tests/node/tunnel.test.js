import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { cli, hasCliError, insertStdin } from '../browser/helpers.js';
import { temporaryState } from './state-fixture.js';
import { tunnelFixture } from './tunnel-fixture.js';
import { parseCommand } from '../../src/cli/parse.js';
import { verifyDownload } from '../../src/tunnel/binary.js';
import { readTunnelOrigin } from '../../src/tunnel/session-tunnel.js';
import { isProcessAlive, readSession } from '../../src/sessions/store.js';
import { checkTunnelActivity } from '../../src/tunnel/activity.js';
import { prepareCachedMarkup } from '../../src/sessions/cache.js';

test('tunnel options and verified download metadata reject invalid inputs', () => {
  assert.partialDeepStrictEqual(parseCommand(['start', 'desk', '--tunnel', '--no-open']), { tunnel: true, open: false });
  assert.partialDeepStrictEqual(parseCommand(['share', 'desk']), { command: 'share' });
  assert.throws(() => parseCommand(['share', 'desk', '--tunnel']));
  assert.throws(() => parseCommand(['status', 'desk', '--tunnel']));
  for (let action of ['renew', 'check']) {
    assert.partialDeepStrictEqual(parseCommand(['tunnel', action, 'desk']), { command: `tunnel ${action}`, sessionId: 'desk' });
    assert.deepEqual(parseCommand(['tunnel', action, 'all']), { kind: 'all', command: `tunnel ${action} all` });
    for (let suffix of [[], ['desk', 'extra'], ['desk', '--tunnel'], ['desk', '--no-open'], ['all', 'extra'], ['all', '--tunnel']]) {
      assert.throws(() => parseCommand(['tunnel', action, ...suffix]));
    }
  }
  assert.throws(() => parseCommand(['tunnel', 'unknown', 'desk']));
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
  assert.equal(session.publicViewerUrl, `${session.publicUrl}?mode=viewer`);
  assert.equal(session.publicUserUrl, `${session.publicUrl}?mode=user`);
  assert.equal(session.tunnel.state, 'ready');
  let origin = new URL(session.publicUrl).origin;
  let socket = new WebSocket(new URL('socket', session.url).href.replace('http:', 'ws:'), { origin });
  let rendered = new Promise((resolve) => socket.on('message', (data) => {
    let message = JSON.parse(data.toString());
    if (message.type === 'render') { resolve(message); }
  }));
  await once(socket, 'open');
  let message = await rendered;
  assert.equal(message.stylesheetUrl, '/styles.css.js');
  socket.send(JSON.stringify({ type: 'result', id: message.id }));
  assert.equal((await cli('pages', sessionId)).pages[0].url, session.publicUrl);
  let shares = await Promise.all([cli('share', sessionId), cli('share', sessionId)]);
  assert.equal(shares.every((reply) => reply.publicUrl === session.publicUrl), true);
  let [pid] = await fixture.pids();
  assert.equal((await fixture.pids()).length, 1);
  assert.equal(isProcessAlive(pid), true);
  let status = await cli('status', sessionId);
  assert.equal(status.tunnel.active, true);
  assert.ok(status.tunnel.checkedAt);
  assert.equal(status.publicViewerUrl, session.publicViewerUrl);
  assert.equal(new URL(status.publicUserUrl).hash, '');
  let listing = await cli('status', 'all');
  assert.equal(listing.total, 1);
  assert.partialDeepStrictEqual(listing.sessions[0], {
    ok: true,
    sessionId,
    pid: (await readSession(sessionId))?.pid,
    url: session.url,
    publicUrl: session.publicUrl,
    publicUserUrl: session.publicUserUrl,
    publicViewerUrl: session.publicViewerUrl,
  });
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
  let listing = await cli('status', 'all');
  assert.equal(listing.sessions[0].tunnel.state, 'failed');
  for (let key of ['publicUrl', 'publicUserUrl', 'publicViewerUrl']) {
    assert.equal(listing.sessions[0][key], undefined);
  }
  let denied = new WebSocket(new URL('socket', status.url).href.replace('http:', 'ws:'), { origin: new URL(shared.publicUrl).origin });
  await assert.rejects(once(denied, 'open'), /403/);
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

test('tunnel checks reject HTTP errors, wrong identities, invalid JSON, and timeouts', async (t) => {
  /** @type {Response | Error} */
  let reply = new Response('', { status: 503 });
  /** @type {typeof fetch} */
  let fetchReply = async (input, options) => {
    assert.equal(options?.redirect, 'error');
    assert.equal(options?.cache, 'no-store');
    assert.ok(options?.signal instanceof AbortSignal);
    assert.ok(new URL(String(input)).searchParams.get('nonce'));
    if (reply instanceof Error) { throw reply; }
    return reply;
  };
  t.mock.method(globalThis, 'fetch', fetchReply);
  for (let result of [
    new Response('', { status: 503 }),
    new Response('<html>Cloudflare error page</html>'),
    Response.json({ sessionId: 'other', nonce: 'stale' }),
    Response.json({ sessionId: 'desk', nonce: 'stale' }),
    new DOMException('Timed out', 'TimeoutError'),
  ]) {
    reply = result;
    let status = await checkTunnelActivity({ sessionId: 'desk', state: 'waiting', publicUrl: 'https://example.trycloudflare.com/desk/', tunnel: { state: 'ready' } });
    assert.equal(status.tunnel?.state, 'ready');
    assert.equal(status.tunnel?.active, false);
    assert.ok(status.tunnel?.checkError);
    assert.ok(status.tunnel?.checkedAt);
  }
});

test('tunnel renew replaces a live connector and checks distinguish disabled links from running sessions', {
  skip: process.platform === 'win32' && 'The executable fixture uses a POSIX shebang.',
}, async (t) => {
  let state = await temporaryState();
  let fixture = await tunnelFixture(state.directory);
  t.after(async () => {
    await Promise.all(['renew', 'private'].map((id) => cli('stop', id).catch(() => {})));
    fixture.close();
    await state.close();
  });
  await cli('start', 'renew', '--no-open');
  await insertStdin('renew', '<p>Preserved interface</p>');
  let shared = await cli('tunnel', 'renew', 'renew');
  assert.equal(shared.tunnel.active, true);
  let original = await readSession('renew');
  let [oldPid] = await fixture.pids();
  await fixture.setActivity('disabled');
  let inactive = await cli('status', 'renew');
  assert.equal(inactive.active, true);
  assert.equal(inactive.tunnel.state, 'ready');
  assert.equal(inactive.tunnel.active, false);
  assert.match(inactive.tunnel.checkError, /503/);
  await assert.rejects(cli('tunnel', 'check', 'renew'), (error) => {
    let result = JSON.parse(/** @type {Error & { stdout: string }} */ (error).stdout);
    assert.equal(result.ok, false);
    assert.equal(result.tunnel.active, false);
    assert.equal(result.error.code, 'TUNNEL_FAILED');
    return true;
  });
  let all = await cli('status', 'all');
  assert.equal(all.sessions[0].tunnel.active, false);
  await fixture.setOrigin('https://renewed.trycloudflare.com');
  await fixture.setActivity('ready');
  await fixture.setMode('slow-ready');
  let renewed = await Promise.all([cli('tunnel', 'renew', 'renew'), cli('tunnel', 'renew', 'renew')]);
  assert.equal(renewed[0].publicUrl, 'https://renewed.trycloudflare.com/renew/');
  assert.equal(renewed[1].publicUrl, renewed[0].publicUrl);
  assert.equal(renewed[0].tunnel.active, true);
  assert.notEqual(renewed[0].publicUrl, shared.publicUrl);
  assert.equal((await readSession('renew'))?.instanceId, original?.instanceId);
  assert.equal(isProcessAlive(oldPid), false);
  assert.equal((await fixture.pids()).length, 2);
  assert.equal((await cli('tunnel', 'check', 'renew')).tunnel.active, true);
  let denied = new WebSocket(new URL('socket', shared.url).href.replace('http:', 'ws:'), { origin: new URL(shared.publicUrl).origin });
  await assert.rejects(once(denied, 'open'), /403/);
  await fixture.setMode('fail');
  await assert.rejects(cli('tunnel', 'renew', 'renew'), (error) => hasCliError(error, 'TUNNEL_FAILED'));
  assert.equal((await cli('status', 'renew')).active, true);
  assert.equal((await cli('status', 'renew')).publicUrl, undefined);
  await fixture.setMode('ready');
  await cli('start', 'private', '--no-open');
  let cache = await prepareCachedMarkup('saved-only', '<p>Saved</p>');
  await cache.commit();
  let bulk = await cli('tunnel', 'renew', 'all');
  assert.equal(bulk.total, 1);
  assert.equal(bulk.sessions[0].sessionId, 'renew');
  assert.equal(bulk.sessions[0].tunnel.active, true);
  assert.equal((await cli('status', 'private')).tunnel, undefined);
  assert.equal((await readSession('renew'))?.instanceId, original?.instanceId);
  assert.equal((await cli('tunnel', 'check', 'all')).total, 1);
  await fixture.setActivity('wrong');
  await assert.rejects(cli('tunnel', 'check', 'all'), (error) => {
    let result = JSON.parse(/** @type {Error & { stdout: string }} */ (error).stdout);
    assert.equal(result.total, 1);
    assert.equal(result.sessions[0].ok, false);
    assert.equal(result.sessions[0].tunnel.active, false);
    return true;
  });
  await assert.rejects(cli('tunnel', 'renew', 'saved-only'), (error) => hasCliError(error, 'SESSION_STOPPED'));
  await assert.rejects(cli('tunnel', 'check', 'saved-only'), (error) => hasCliError(error, 'TUNNEL_FAILED'));
});

test('stopping during tunnel renewal cancels the replacement connector', {
  skip: process.platform === 'win32' && 'The executable fixture uses a POSIX shebang.',
}, async (t) => {
  let state = await temporaryState();
  let fixture = await tunnelFixture(state.directory);
  t.after(async () => {
    await cli('stop', 'cancel-renew').catch(() => {});
    fixture.close();
    await state.close();
  });
  await cli('start', 'cancel-renew', '--tunnel', '--no-open');
  await fixture.setMode('wait');
  let renewing = assert.rejects(cli('tunnel', 'renew', 'cancel-renew'), (error) => hasCliError(error, 'TUNNEL_FAILED'));
  /** @type {number[]} */
  let pids = [];
  for (let attempt = 0; attempt < 50; attempt += 1) {
    pids = await fixture.pids();
    if (pids.length === 2) { break; }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.equal(pids.length, 2);
  await cli('stop', 'cancel-renew');
  await renewing;
  assert.equal(pids.every((pid) => !isProcessAlive(pid)), true);
});
