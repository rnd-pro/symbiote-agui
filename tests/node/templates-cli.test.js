import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { lstat, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';
import { parseCommand } from '../../src/cli/parse.js';
import { createTemplate } from '../../src/templates/create.js';
import { definitionPaths } from '../../src/library/paths.js';
import { metadataPath } from '../../src/metadata/store.js';
import { listProjects } from '../../src/projects/registry.js';
import { readSession } from '../../src/sessions/store.js';
import { validateMetadata } from '../../src/metadata/validate.js';
import { temporaryState } from './state-fixture.js';

let execute = promisify(execFile);
let cliPath = fileURLToPath(new URL('../../bin/symbiote-agui.js', import.meta.url));

/** @param {string[]} args */
async function cli(...args) {
  let {
    stdout,
  } = await execute(process.execPath, [
    cliPath,
    ...args,
  ], {
    timeout: 45_000,
  });
  return JSON.parse(stdout);
}

/** @param {string} path */
async function absent(path) {
  await assert.rejects(lstat(path), {
    code: 'ENOENT',
  });
}

test('template commands isolate their options and validate identities', () => {
  assert.deepEqual(parseCommand([
    'templates',
    'list',
    '--query',
    'workspace',
  ]), {
    kind: 'template',
    command: 'list',
    query: 'workspace',
  });
  assert.partialDeepStrictEqual(parseCommand([
    'templates',
    'create',
    'workspace',
    'desk',
    '--config',
    'config.json',
  ]), {
    command: 'create',
    templateId: 'workspace',
    sessionId: 'desk',
    config: 'config.json',
  });
  for (let args of [
    'templates',
    'templates unknown',
    'templates list extra',
    'templates list --no-open',
    'templates describe workspace --config config.json',
    'templates create workspace',
    'templates create ../workspace desk',
    'templates create workspace ../desk',
    'templates create workspace desk --replace',
    'templates create workspace desk extra',
    'start desk --config config.json',
  ]) { assert.throws(() => parseCommand(args.split(' '))); }
  assert.throws(() => parseCommand([
    'templates',
    'create',
    'workspace',
    'desk',
    '--config',
    '',
  ]));
});

test('CLI creates saved starters in Default and project storage, records provenance, and starts existing saved HTML', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let list = await cli('templates', 'list', '--query', 'workspace');
  assert.ok(list.templates.some((/** @type {{ id: string }} */ entry) => entry.id === 'workspace'));
  let contract = await cli('templates', 'describe', 'workspace');
  assert.equal(contract.template.id, 'workspace');
  assert.ok(contract.template.configuration.properties.DATA);
  assert.ok(contract.assets.some((/** @type {{ path: string }} */ entry) => entry.path === 'content.html'));
  assert.equal(Object.hasOwn(contract, 'html'), false);
  let note = '</script><img src=x onerror=alert(1)>{{UI/inspectorOpen}}';
  let config = join(state.directory, 'config.json');
  await writeFile(config, JSON.stringify({
    DATA: {
      note,
    },
  }));
  for (let folder of [
    '',
    join(state.directory, 'project'),
  ]) {
    process.env.AGUI_LIBRARY_DIR = folder;
    if (folder) { await mkdir(folder); }
    let result = await cli('templates', 'create', 'workspace', 'desk', '--config', config);
    assert.equal(result.active, false);
    assert.equal(Object.hasOwn(result, 'html'), false);
    assert.equal(await readSession('desk'), undefined);
    let metadata = (await cli('metadata', 'get', 'desk')).metadata;
    assert.equal(metadata.template.id, 'workspace');
    let manifest = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
    assert.equal(metadata.template.packageVersion, manifest.version);
    assert.deepEqual((await cli('describe', 'desk')).metadata, metadata);
    assert.match(await readFile(result.descriptionPath, 'utf8'), /## Data flow/);
    let html = await readFile(result.htmlPath, 'utf8');
    assert.doesNotMatch(html, /<img/);
    assert.equal(html.includes('\\u003c/script>'), true);
    assert.match(await readFile(join(result.assetsPath, 'content.html'), 'utf8'), /DATA\/note/);
    let projects = await listProjects(folder || undefined);
    assert.ok(projects.projects.some((entry) => folder ? entry.folder === folder : entry.id === 'default'));
    try {
      let started = await cli('start', 'desk', '--no-open');
      assert.ok(started.url);
      assert.equal((await cli('status', 'desk')).active, true);
      let asset = await fetch(new URL('./_assets/content.html', started.url));
      assert.equal(asset.status, 200);
      assert.match(await asset.text(), /DATA\/note/);
    } finally { await cli('stop', 'desk'); }
  }
});

test('invalid template configuration creates no session or project storage', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let config = join(state.directory, 'invalid.json');
  process.env.AGUI_LIBRARY_DIR = join(state.directory, 'new-project');
  for (let content of [
    '{broken',
    '{"DATA":{"missing":"value"}}',
    '{"ROUTER":{"routes":{"workspace":{"title":"Unsafe","src":"./_assets/../private.html","default":true}}}}',
  ]) {
    await writeFile(config, content);
    await assert.rejects(cli('templates', 'create', 'workspace', 'invalid', '--config', config));
    await absent(process.env.AGUI_LIBRARY_DIR);
    assert.deepEqual(await readdir(state.directory), [
      'invalid.json',
    ]);
  }
  await assert.rejects(createTemplate('workspace', 'all'));
});

test('creation rejects existing definitions, orphan assets, metadata, case collisions, links, and running sessions', async (t) => {
  let state = await temporaryState();
  t.after(async () => { await cli('stop', 'running').catch(() => {}); await state.close(); });
  process.env.AGUI_LIBRARY_DIR = join(state.directory, 'project');
  await mkdir(process.env.AGUI_LIBRARY_DIR);
  let files = definitionPaths('blocked');
  for (let path of [
    files.htmlPath,
    files.descriptionPath,
    files.proxyPath,
    metadataPath('blocked'),
  ]) {
    await mkdir(dirname(path), {
      recursive: true,
    });
    await writeFile(path, 'Keep existing bytes');
    await assert.rejects(createTemplate('workspace', 'blocked'));
    assert.equal(await readFile(path, 'utf8'), 'Keep existing bytes');
    await rm(path);
  }
  await mkdir(files.assetsPath);
  await assert.rejects(createTemplate('workspace', 'blocked'));
  await rm(files.assetsPath, {
    recursive: true,
  });
  let other = join(process.env.AGUI_LIBRARY_DIR, 'Blocked.html');
  await writeFile(other, 'Keep case collision');
  await assert.rejects(createTemplate('workspace', 'blocked'));
  await rm(other);
  let external = join(state.directory, 'external.html');
  await writeFile(external, 'Keep link target');
  await symlink(external, files.htmlPath);
  await assert.rejects(createTemplate('workspace', 'blocked'));
  assert.equal(await readFile(external, 'utf8'), 'Keep link target');
  await rm(files.htmlPath);
  await cli('start', 'running', '--no-open');
  await assert.rejects(createTemplate('workspace', 'running'), {
    code: 'SESSION_EXISTS',
  });
});

test('concurrent creates publish once and interrupted publication preserves a competing file while removing owned artifacts', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let results = await Promise.allSettled([
    createTemplate('workspace', 'once'),
    createTemplate('workspace', 'once'),
  ]);
  assert.equal(results.filter((entry) => entry.status === 'fulfilled').length, 1);
  let files = definitionPaths('interrupted');
  await assert.rejects(createTemplate('workspace', 'interrupted', {}, {
    async beforePublish() {
      await writeFile(files.descriptionPath, 'Written by another owner');
    },
  }));
  assert.equal(await readFile(files.descriptionPath, 'utf8'), 'Written by another owner');
  await absent(files.htmlPath);
  await absent(files.assetsPath);
  await absent(metadataPath('interrupted'));
  assert.equal((await readdir(dirname(files.htmlPath))).some((name) => name.endsWith('.tmp')), false);
  let changed = definitionPaths('changed-assets');
  await assert.rejects(createTemplate('workspace', 'changed-assets', {}, {
    async beforePublish() {
      await writeFile(join(changed.assetsPath, 'content.html'), 'Keep modified content');
      await writeFile(changed.descriptionPath, 'Publication conflict');
    },
  }), /some destination files changed/);
  assert.equal(await readFile(join(changed.assetsPath, 'content.html'), 'utf8'), 'Keep modified content');
  await absent(changed.htmlPath);
  await absent(metadataPath('changed-assets'));
});

test('provenance validation permits other metadata and rejects arbitrary runtime fields', () => {
  let value = {
    template: {
      id: 'workspace',
      packageVersion: '1.2.3',
    },
  };
  assert.deepEqual(validateMetadata(value), value);
  for (let template of [
    null,
    {
      id: '../workspace',
      packageVersion: '1.2.3',
    },
    {
      id: 'workspace',
      packageVersion: 'invalid',
    },
    {
      ...value.template,
      command: 'unexpected',
    },
  ]) {
    assert.throws(() => validateMetadata({
      template,
    }));
  }
});
