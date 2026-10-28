import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, mkdtemp, mkdir, readFile, readdir, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { MCP_TOOLS } from '../../src/mcp/catalog.js';

let execute = promisify(execFile);
let root = fileURLToPath(new URL('../../', import.meta.url));

test('the production tarball runs through npm exec outside the checkout', { timeout: 180_000 }, async (t) => {
  let npm = process.env.npm_execpath || '';
  assert.ok(npm, 'Run this smoke test with npm run test:package.');
  let directory = await mkdtemp(join(tmpdir(), 'agui package '));
  let caller = join(directory, 'caller');
  let cache = join(directory, 'cache');
  let started = false;
  /** @type {NodeJS.ProcessEnv} */
  let environment = {
    ...process.env,
    PATH: process.env.PATH?.split(delimiter).filter((entry) => !entry.startsWith(root)).join(delimiter),
    AGUI_STATE_DIR: join(directory, 'state'),
    AGUI_LIBRARY_DIR: '',
    npm_config_cache: cache,
    npm_config_omit: 'dev',
    npm_config_audit: 'false',
    npm_config_fund: 'false',
    npm_config_fetch_retries: '0',
    npm_config_fetch_timeout: '30000',
  };
  delete environment.AGUI_WORKER_STATE_DIR;
  await mkdir(caller);
  t.after(async () => {
    try {
      await cli('manager', 'stop').catch(() => {});
      if (started) { await cli('stop', 'package-smoke'); }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  /**
   * @param {string[]} args
   * @param {string} cwd
   */
  async function runNpm(args, cwd) {
    let { stdout } = await execute(process.execPath, [npm, ...args], {
      cwd,
      env: environment,
      timeout: 120_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    return stdout;
  }

  let packages = JSON.parse(await runNpm(['pack', '--json', '--pack-destination', directory], root));
  let packed = Array.isArray(packages) ? packages[0] : Object.values(packages)[0];
  let files = packed.files.map((/** @type {{path: string}} */ file) => file.path);
  for (let path of [
    'bin/symbiote-agui.js',
    'src/page/shell.html',
    'src/page/theme.css',
    'src/page/client/index.js',
    'src/page/client/tool-bridge.js',
    'src/mcp/server.js',
    'src/manager/worker.js',
    'src/manager/page/index.html',
    'src/manager/page/index.js',
    'src/manager/page/rows.js',
    'src/manager/page/connection.js',
    'src/manager/page/styles.css',
    'skills/agui/SKILL.md',
  ]) {
    assert.ok(files.includes(path), `${path} must be included in the tarball.`);
  }
  assert.equal(files.some((/** @type {string} */ path) => /^(tests|planning|node_modules)\//.test(path) || path === 'AGENTS.md'), false);
  let archive = join(directory, packed.filename);

  /**
   * @param {string[]} args
   * @param {boolean} [offline]
   */
  function npx(args, offline = true) {
    return runNpm(['exec', '--yes', ...(offline ? ['--offline'] : []), '--package', archive, '--', 'symbiote-agui', ...args], caller);
  }

  /** @param {string[]} args */
  async function cli(...args) {
    return JSON.parse(await npx(args));
  }

  assert.match(await npx(['--help'], false), /Usage: symbiote-agui/);
  assert.equal((await npx(['--version'])).trim(), packed.version);
  let installs = await readdir(join(cache, '_npx'));
  assert.equal(installs.length, 1);
  let modules = join(cache, '_npx', installs[0], 'node_modules');
  await assert.rejects(access(join(modules, 'puppeteer-core')));
  let manifest = JSON.parse(await readFile(join(modules, 'symbiote-agui', 'package.json'), 'utf8'));
  assert.equal(manifest.private, undefined);

  let session = await cli('start', 'package-smoke', '--no-open');
  started = true;
  assert.equal(session.state, 'waiting');
  assert.equal((await cli('status', 'package-smoke')).url, session.url);
  let managerSource = '<h1>Packaged project workflow</h1>';
  await writeFile(join(caller, 'manager-source.html'), managerSource);
  await cli('insert', 'package-smoke', '--file', 'manager-source.html');
  let manager = await cli('manager', '--no-open');
  assert.equal(manager.active, true);
  assert.equal((await cli('manager', 'status')).url, manager.url);
  for (let path of ['', 'page/index.js', 'page/theme.js', 'page/styles.css']) {
    let response = await fetch(new URL(path, manager.url));
    assert.equal(response.status, 200, `Packaged manager asset: ${path}`);
    assert.ok((await response.text()).length);
  }
  let managerUrl = new URL(manager.url);
  let socket = new WebSocket(new URL('socket', manager.url), {
    origin: managerUrl.origin,
  });
  await once(socket, 'open');
  let authorized = once(socket, 'message');
  socket.send(JSON.stringify({
    type: 'authenticate',
    token: new URL(manager.launchUrl).hash.slice(1),
  }));
  assert.equal(JSON.parse(String((await authorized)[0])).type, 'authorized');
  /**
   * @param {import('../../types/manager.js').ManagerOperation} operation
   * @param {Partial<import('../../types/manager.js').ManagerRequest>} [options]
   * @returns {Promise<import('../../types/manager.js').ManagerResult>}
   */
  async function manage(operation, options = {}) {
    let id = randomUUID();
    let reply = once(socket, 'message', {
      signal: AbortSignal.timeout(15000),
    });
    socket.send(JSON.stringify({
      ...options,
      id,
      operation,
    }));
    let message = JSON.parse(String((await reply)[0]));
    assert.equal(message.id, id);
    assert.equal(message.result.ok, true, message.result.error?.message);
    return message.result;
  }
  try {
    let team = join(caller, 'team folder');
    await mkdir(team);
    let connected = await manage('connect project', {
      folder: team,
    });
    assert.ok(connected.project);
    let listing = await manage('project entries', {
      projectId: 'default',
      path: '',
    });
    assert.ok(listing.directory?.entries.some((entry) => entry.path === 'package-smoke.html'));
    let preview = await manage('project preview', {
      projectId: 'default',
      path: 'package-smoke.html',
    });
    assert.equal(preview.preview?.text, managerSource);
    let copied = await manage('copy session', {
      sessionId: 'package-smoke',
      destinationProjectId: connected.project.id,
      destinationSessionId: 'package-copy',
      includeData: false,
      includeMetadata: false,
      confirm: true,
    });
    assert.equal(copied.transfer?.state, 'complete');
    assert.equal(await readFile(join(team, 'package-copy.html'), 'utf8'), managerSource);
    let selected = await manage('switch project', {
      projectId: 'default',
    });
    assert.equal(selected.project?.id, 'default');
    assert.equal(selected.projects?.currentProjectId, 'default');
    assert.equal((await cli('manager', 'status')).url, manager.url, 'Project switching retains the packaged manager.');
    assert.equal((await cli('status', 'package-smoke')).url, session.url);
  } finally {
    socket.close();
    await once(socket, 'close');
  }
  assert.equal((await cli('manager', 'stop')).active, false);
  assert.deepEqual((await cli('pages', 'package-smoke')).pages, []);
  await assert.rejects(cli('tools', 'package-smoke'), (error) => {
    let failure = /** @type {Error & { stdout: string }} */ (error);
    return JSON.parse(failure.stdout).error.code === 'PAGE_UNAVAILABLE';
  });
  await writeFile(join(caller, 'invalid call.json'), '{}');
  await assert.rejects(cli('call', 'package-smoke', '--file', 'invalid call.json'), (error) => {
    let failure = /** @type {Error & { stdout: string }} */ (error);
    return JSON.parse(failure.stdout).error.code === 'INVALID_INPUT';
  });
  let transport = new StdioClientTransport({
    command: process.execPath,
    args: [npm, 'exec', '--yes', '--offline', '--package', archive, '--', 'symbiote-agui', 'mcp'],
    cwd: caller,
    env: /** @type {Record<string, string>} */ (environment),
    stderr: 'pipe',
  });
  let mcp = new Client({ name: 'package-smoke', version: '1.0.0' });
  try {
    await mcp.connect(transport);
    let catalog = (await mcp.listTools()).tools.map((tool) => tool.name);
    for (let name of Object.keys(MCP_TOOLS)) { assert.ok(catalog.includes(name), `Packaged MCP tool: ${name}`); }
    let result = await mcp.callTool({ name: 'list_pages', arguments: { sessionId: 'package-smoke' } });
    assert.partialDeepStrictEqual(result, { structuredContent: { sessionId: 'package-smoke', pages: [] }, isError: false });
  } finally {
    await mcp.close();
  }
  await writeFile(join(caller, 'view with spaces.html'), '<h1 class="w-[123px]">Packaged AGUI</h1>');
  assert.equal((await cli('insert', 'package-smoke', '--file', 'view with spaces.html')).delivery, 'queued');
  for (let path of [new URL(session.url).pathname, '/client/index.js', '/styles.css.js']) {
    let response = await fetch(new URL(path, session.url));
    assert.equal(response.status, 200, path);
    let content = await response.text();
    assert.ok(content.length > 0, path);
    if (path === '/styles.css.js') { assert.match(content, /123px/); }
  }
  assert.deepEqual((await cli('events', 'package-smoke')).events, []);
  assert.equal((await cli('stop', 'package-smoke')).state, 'stopped');
  started = false;
  assert.equal((await cli('status', 'package-smoke')).state, 'stopped');
  await unlink(join(caller, 'view with spaces.html'));
  let restored = await cli('start', 'package-smoke', '--no-open');
  started = true;
  assert.equal(restored.restored, true);
  assert.equal(new URL(restored.url).pathname, new URL(session.url).pathname);
  assert.match(await (await fetch(new URL('/styles.css.js', restored.url))).text(), /123px/);
  assert.equal((await cli('clear', 'package-smoke')).cleared, true);
  await cli('stop', 'package-smoke');
  started = false;
  assert.equal((await cli('clear', 'package-smoke')).cleared, true);
  let empty = await cli('start', 'package-smoke', '--no-open');
  started = true;
  assert.equal(empty.restored, false);
  assert.doesNotMatch(await (await fetch(new URL('/styles.css.js', empty.url))).text(), /123px/);
  let cleared = await cli('clear-all');
  assert.equal(cleared.ok, true);
  assert.equal(cleared.total, 1);
  assert.partialDeepStrictEqual(cleared.sessions, [{ ok: true, sessionId: 'package-smoke', cleared: true }]);
  let stopped = await cli('stop-all');
  assert.equal(stopped.ok, true);
  assert.equal(stopped.total, 1);
  started = false;
});
