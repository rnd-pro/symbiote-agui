import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { assetFixture } from './assets-fixture.js';
import { temporaryManagerProject } from './manager-storage-fixture.js';
import { definitionPaths } from '../../src/library/paths.js';
import { reserveSession } from '../../src/sessions/store.js';
import { statusSession } from '../../src/sessions/lifecycle.js';
import { startControlServer } from '../../src/server/control-server.js';
import { closeServer } from '../../src/shared/server.js';
import { writeSession } from '../../src/sessions/store.js';

test('stopped and older workers never claim local asset HTTP capability', async (t) => {
  let fixture = await assetFixture();
  t.after(() => fixture.close());
  let stopped = await statusSession('desk');
  assert.deepEqual(stopped.assets, {
    configured: false,
    available: false,
    path: '/desk/_assets/',
  });
  await fixture.run([
    'add',
    'desk',
    '--file',
    fixture.source,
  ]);
  assert.equal((await statusSession('desk')).assets?.configured, true);
  let record = await reserveSession('legacy');
  let control = await startControlServer(record, () => ({
    sessionId: record.sessionId,
    state: 'waiting',
  }), async () => {});
  t.after(() => closeServer(control.server));
  record.controlUrl = control.url;
  await writeSession(record);
  let legacy = await statusSession('legacy');
  assert.deepEqual(legacy.assets, {
    configured: false,
    available: false,
    path: '/legacy/_assets/',
  });
});

test('real worker reports asset availability and serves project-scoped files added after startup', {
  timeout: 60_000,
}, async (t) => {
  let project = await temporaryManagerProject();
  t.after(() => project.close());
  let source = join(project.directory, 'logo.svg');
  let html = join(project.directory, 'input.html');
  await writeFile(source, '<svg/>');
  await writeFile(html, '<img src="./_assets/logo.svg" alt="Logo">');
  await project.cli([
    'save',
    'desk',
    '--file',
    html,
  ], '');
  let first = await project.cli([
    'start',
    'desk',
    '--no-open',
  ], '');
  assert.deepEqual(first.assets, {
    configured: false,
    available: true,
    path: '/desk/_assets/',
  });
  await project.cli([
    'assets',
    'add',
    'desk',
    '--file',
    source,
  ], '');
  let after = await project.cli([
    'status',
    'desk',
  ], '');
  assert.equal(after.instanceId, first.instanceId);
  assert.equal(after.assets.configured, true);
  assert.equal(after.assets.available, true);
  assert.equal(await (await fetch(new URL('_assets/logo.svg', first.url))).text(), '<svg/>');
  assert.equal((await fetch(new URL('/desk.assets/logo.svg', first.url))).status, 404);
  let folder = join(project.directory, 'library');
  await mkdir(folder);
  await project.cli([
    'save',
    'desk',
    '--file',
    html,
  ], folder);
  let second = await project.cli([
    'start',
    'desk',
    '--no-open',
  ], folder);
  assert.equal((await fetch(new URL('_assets/logo.svg', second.url))).status, 404);
  await writeFile(source, '<svg id="project"/>');
  await project.cli([
    'assets',
    'add',
    'desk',
    '--file',
    source,
  ], folder);
  assert.equal(await (await fetch(new URL('_assets/logo.svg', second.url))).text(), '<svg id="project"/>');
  assert.equal(await (await fetch(new URL('_assets/logo.svg', first.url))).text(), '<svg/>');
  let combined = await project.cli([
    'status',
    'all',
  ], folder);
  assert.equal(combined.sessions[0].assets.available, true);
  assert.equal(combined.sessions[0].assets.configured, true);
  assert.equal(await readFile(join(folder, 'desk.assets/logo.svg'), 'utf8'), '<svg id="project"/>');
  assert.equal(definitionPaths('desk').assetsPath.includes(folder), false, 'Worker folder selection does not change the caller.');
  await project.cli([
    'clear',
    'desk',
  ], folder);
  assert.equal((await fetch(new URL('_assets/logo.svg', second.url))).status, 404, 'Clearing the definition revokes asset delivery.');
});
