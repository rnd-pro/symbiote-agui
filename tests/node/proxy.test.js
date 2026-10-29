import assert from 'node:assert/strict';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { parseCommand } from '../../src/cli/parse.js';
import { normalizeProxyOrigin, proxyAllowsUrl, validateProxyPolicy } from '../../src/proxy/policy.js';
import { PROXY_LIMITS } from '../../src/proxy/constants.js';
import { runProxyCommand } from '../../src/proxy/service.js';
import { definitionPaths } from '../../src/library/paths.js';
import { prepareCachedMarkup } from '../../src/sessions/cache.js';
import { readSession, reserveSession } from '../../src/sessions/store.js';
import { requestSession } from '../../src/sessions/client.js';
import { startControlServer } from '../../src/server/control-server.js';
import { closeServer } from '../../src/shared/server.js';
import { temporaryManagerProject } from './manager-storage-fixture.js';
import { temporaryState } from './state-fixture.js';

test('proxy commands normalize origins, require exact positional arguments, and reject unrelated options', () => {
  assert.deepEqual(parseCommand([
    'proxy',
    'allow',
    'desk',
    'HTTPS://EXAMPLE.TEST:443/',
  ]), {
    kind: 'proxy',
    command: 'allow',
    sessionId: 'desk',
    origin: 'https://example.test',
  });
  assert.equal(parseCommand([
    'proxy',
    'status',
    'desk',
  ]).kind, 'proxy');
  for (let args of [
    [
      'proxy',
    ],
    [
      'proxy',
      'enable',
      'desk',
    ],
    [
      'proxy',
      'allow',
      'desk',
    ],
    [
      'proxy',
      'remove',
      'desk',
    ],
    [
      'proxy',
      'status',
      '../outside',
    ],
    [
      'proxy',
      'status',
      'desk',
      'https://example.test',
    ],
    [
      'proxy',
      'status',
      'desk',
      '--tunnel',
    ],
    [
      'proxy',
      'allow',
      'desk',
      'https://example.test',
      '--file',
      'x',
    ],
  ]) { assert.throws(() => parseCommand(args), {
    code: 'INVALID_INPUT',
  }); }
});

test('proxy policy is bounded and matches parsed origins without suffix, scheme, port, or credential expansion', () => {
  let policy = validateProxyPolicy({
    version: 1,
    allowedOrigins: [
      'https://example.test/',
      'HTTPS://EXAMPLE.TEST:443',
    ],
  });
  assert.deepEqual(policy.allowedOrigins, [
    'https://example.test',
  ]);
  assert.equal(proxyAllowsUrl(policy, 'https://example.test/feed.xml?format=rss'), true);
  for (let target of [
    'https://example.test.evil.test/data',
    'https://sub.example.test/data',
    'http://example.test/data',
    'https://example.test:8443/data',
    'https://user:pass@example.test/data',
    'data:text/plain,example',
  ]) { assert.equal(proxyAllowsUrl(policy, target), false, target); }
  for (let origin of [
    'https://example.test/path',
    'https://example.test/a/..',
    'https:example.test',
    'https://user:pass@example.test',
    'https://example.test?token=secret',
    'https://example.test#',
    'https://*.example.test',
    'https://example.test:8443',
    'https://example.test\n',
    'file:///etc/',
  ]) { assert.throws(() => normalizeProxyOrigin(origin), {
    code: 'INVALID_INPUT',
  }); }
  assert.throws(() => validateProxyPolicy({
    ...policy,
    command: 'run',
  }));
  assert.throws(() => validateProxyPolicy({
    version: 2,
    allowedOrigins: [],
  }));
  assert.throws(() => validateProxyPolicy({
    version: 1,
    allowedOrigins: Array.from({
      length: PROXY_LIMITS.origins + 1,
    }, (_, i) => `https://source${i}.test`),
  }));
  assert.throws(() => validateProxyPolicy({
    version: 1,
    allowedOrigins: Array.from({
      length: 10,
    }, (_, i) => `https://${'a'.repeat(1800)}${i}.test`),
  }), /size limit/);
});

test('CLI policy updates preserve a live worker, require control authentication, and survive sync and restart', {
  timeout: 60_000,
}, async (t) => {
  let project = await temporaryManagerProject();
  t.after(() => project.close());
  let html = join(project.directory, 'source.html');
  await writeFile(html, '<p>Proxy policy fixture</p>');
  await project.cli([
    'save',
    'desk',
    '--file',
    html,
  ]);
  let initial = await project.cli([
    'proxy',
    'status',
    'desk',
  ]);
  assert.equal(initial.proxy.enabled, false);
  assert.equal(initial.proxy.available, false);
  assert.match(initial.proxy.urlTemplate, /^\/desk\/_proxy\?url=/);
  await project.cli([
    'start',
    'desk',
    '--no-open',
  ]);
  let before = await readSession('desk');
  assert.ok(before);
  let changed = await project.cli([
    'proxy',
    'allow',
    'desk',
    'https://example.test',
  ]);
  assert.equal(changed.proxy.enabled, true);
  assert.deepEqual(await readSession('desk'), before);
  assert.equal((await fetch(`${before.controlUrl}/proxy`)).status, 401);
  assert.equal((await fetch(`${before.controlUrl}/proxy/change`, {
    method: 'POST',
    body: '{}',
  })).status, 401);
  assert.equal((await fetch(new URL('proxy/change', before.url), {
    method: 'POST',
    body: '{}',
  })).status, 404);
  assert.equal((await fetch(new URL('_proxy?url=https://example.test/data', before.url))).status, 404);
  for (let value of [
    null,
    {
      command: 'allow',
      origin: 'https://evil.test',
      allowedOrigins: [],
    },
    {
      command: 'allow',
      origin: 'https://user:secret@evil.test',
    },
  ]) { await assert.rejects(requestSession(before, 'proxy/change', 2000, JSON.stringify(value)), {
    code: 'INVALID_INPUT',
  }); }
  await assert.rejects(requestSession({
    ...before,
    pid: before.pid + 1,
  }, 'proxy'), {
    code: 'SESSION_UNREACHABLE',
  });
  let path = definitionPaths('desk').proxyPath;
  let policy = {
    version: 1,
    allowedOrigins: [
      'https://updated.test',
    ],
  };
  await writeFile(path, JSON.stringify(policy));
  await project.cli([
    'sync',
    'desk',
  ]);
  assert.deepEqual((await project.cli([
    'proxy',
    'status',
    'desk',
  ])).proxy.policy, policy);
  await writeFile(path, '{broken');
  await assert.rejects(project.cli([
    'sync',
    'desk',
  ]));
  assert.deepEqual((await project.cli([
    'proxy',
    'status',
    'desk',
  ])).proxy.policy, policy, 'A failed sync retains the accepted policy.');
  await writeFile(path, JSON.stringify(policy));
  await project.cli([
    'stop',
    'desk',
  ]);
  await project.cli([
    'start',
    'desk',
    '--no-open',
  ]);
  assert.deepEqual((await project.cli([
    'proxy',
    'status',
    'desk',
  ])).proxy.policy, policy);
  let removed = await project.cli([
    'proxy',
    'remove',
    'desk',
    'https://updated.test',
  ]);
  assert.equal(removed.proxy.enabled, false);
  await project.cli([
    'proxy',
    'allow',
    'desk',
    'https://example.test',
  ]);
  await project.cli([
    'clear',
    'desk',
  ]);
  let cleared = await readSession('desk');
  assert.ok(cleared);
  assert.equal((await requestSession(cleared, 'proxy')).proxy?.enabled, false);
  await assert.rejects(stat(path));
});

test('stopped policies serialize concurrent changes, remain scoped to their project, and fail closed on corruption', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let saved = await prepareCachedMarkup('desk', '<p>Policy fixture</p>');
  try { await saved.commit(); }
  finally { await saved.discard(); }
  let status = {
    kind: /** @type {const} */ ('proxy'),
    command: /** @type {const} */ ('status'),
    sessionId: 'desk',
  };
  await Promise.all([
    'https://first.test',
    'https://second.test',
  ].map((origin) => runProxyCommand({
    ...status,
    command: 'allow',
    origin,
  })));
  let policy = (await runProxyCommand(status))?.proxy?.policy;
  assert.equal(policy?.allowedOrigins.length, 2);
  let defaultPath = definitionPaths('desk').proxyPath;
  let folder = join(state.directory, 'library');
  await mkdir(folder);
  await writeFile(join(folder, 'desk.html'), '<p>Other project</p>');
  process.env.AGUI_LIBRARY_DIR = folder;
  assert.equal((await runProxyCommand(status))?.proxy?.enabled, false);
  await runProxyCommand({
    ...status,
    command: 'allow',
    origin: 'https://third.test',
  });
  assert.equal((await readFile(defaultPath, 'utf8')).includes('third.test'), false);
  let path = definitionPaths('desk').proxyPath;
  await writeFile(path, '{"version":1,"allowedOrigins":["https://*.test"]}');
  await assert.rejects(runProxyCommand(status), {
    code: 'CACHE_ERROR',
  });
  await assert.rejects(runProxyCommand({
    ...status,
    command: 'remove',
    origin: 'https://third.test',
  }), {
    code: 'CACHE_ERROR',
  });
  await assert.rejects(runProxyCommand({
    ...status,
    sessionId: 'missing',
  }), /No saved AGUI/);
});

test('an older worker rejects proxy commands without changing its saved policy', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let record = await reserveSession('legacy');
  let control = await startControlServer(record, () => ({
    sessionId: record.sessionId,
    state: 'waiting',
  }), async () => {});
  t.after(() => closeServer(control.server));
  record.controlUrl = control.url;
  await assert.rejects(requestSession(record, 'proxy'), {
    code: 'NOT_IMPLEMENTED',
  });
  await assert.rejects(stat(definitionPaths('legacy').proxyPath));
});

test('failed markup publication preserves the saved proxy policy when description creation is rolled back', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let saved = await prepareCachedMarkup('desk', '<p>Accepted</p>');
  try { await saved.commit(); }
  finally { await saved.discard(); }
  await runProxyCommand({
    kind: 'proxy',
    command: 'allow',
    sessionId: 'desk',
    origin: 'https://example.test',
  });
  let paths = definitionPaths('desk');
  let policy = await readFile(paths.proxyPath, 'utf8');
  await unlink(paths.descriptionPath);
  let pending = await prepareCachedMarkup('desk', '<p>Replacement</p>');
  await writeFile(paths.htmlPath, '<p>Concurrent update</p>');
  try { await assert.rejects(pending.commit(), /file changed/); }
  finally { await pending.discard(); }
  assert.equal(await readFile(paths.proxyPath, 'utf8'), policy);
  assert.equal(await readFile(paths.htmlPath, 'utf8'), '<p>Concurrent update</p>');
});
