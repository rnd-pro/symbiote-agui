import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import puppeteer from 'puppeteer';

let execute = promisify(execFile);
let fixtures = new URL('../tests/node/fixtures/template-comparison/', import.meta.url);
let output = new URL('../TMP/benchmarks/templates/', import.meta.url);
let temporary = await realpath(await mkdtemp(join(tmpdir(), 'agui-template-comparison-')));
let cliPath = fileURLToPath(new URL('../bin/symbiote-agui.js', import.meta.url));
/** @type {NodeJS.ProcessEnv} */
let environment = {
  ...process.env,
  AGUI_STATE_DIR: temporary,
  AGUI_LIBRARY_DIR: '',
};
delete environment.AGUI_WORKER_STATE_DIR;

/** @param {string[]} args */
async function cli(args) {
  let {
    stdout,
  } = await execute(process.execPath, [
    cliPath,
    ...args,
  ], {
    env: environment,
    timeout: 45_000,
  });
  return {
    result: JSON.parse(stdout),
    responseBytes: Buffer.byteLength(stdout),
  };
}

/** @param {string} text */
function size(text) {
  return {
    bytes: Buffer.byteLength(text),
    lines: text ? text.trimEnd().split(/\r?\n/).length : 0,
  };
}

let brief = 'Notes workspace with one navigation item, sticky header, bottom footer, note editor, clear/close sidebar actions, and paired theme controls. Edits are local and reload resets the note.';
let sources = Object.fromEntries(await Promise.all([
  'from-scratch.html',
  'config.json',
  'description.md',
].map(async (name) => [
  name,
  await readFile(new URL(name, fixtures), 'utf8'),
])));
await mkdir(output, {
  recursive: true,
});
for (let [
  name,
  text,
] of Object.entries(sources)) { await writeFile(new URL(name, output), text); }
/** @type {import('puppeteer').Browser | undefined} */
let browser;
let sessions = new Set();
try {
  browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
  });
  let discoveryStart = performance.now();
  let listed = await cli([
    'templates',
    'list',
  ]);
  let described = await cli([
    'templates',
    'describe',
    'workspace',
  ]);
  let discovery = {
    commands: 2,
    elapsedMs: performance.now() - discoveryStart,
    responseBytes: listed.responseBytes + described.responseBytes,
  };
  let results = [];
  for (let starter of [
    false,
    true,
  ]) {
    let id = starter ? 'starter' : 'from-scratch';
    sessions.add(id);
    let setup = starter ? [
      [
        'templates',
        'create',
        'workspace',
        id,
        '--config',
        fileURLToPath(new URL('config.json', output)),
      ],
      [
        'start',
        id,
        '--no-open',
      ],
    ] : [
      [
        'start',
        id,
        '--no-open',
      ],
      [
        'insert',
        id,
        '--file',
        fileURLToPath(new URL('from-scratch.html', output)),
      ],
    ];
    setup.push([
      'describe',
      id,
      '--file',
      fileURLToPath(new URL('description.md', output)),
    ]);
    let begin = performance.now();
    let responseBytes = 0;
    let url = '';
    for (let args of setup) {
      let reply = await cli(args);
      responseBytes += reply.responseBytes;
      url ||= reply.result.url || '';
    }
    let elapsedMs = performance.now() - begin;
    let page = await browser.newPage();
    try {
      await page.setViewport({
        width: 1440,
        height: 1000,
      });
      await page.goto(url);
      await page.locator('textarea').fill('Working note');
      await page.waitForFunction(() => {
        let owner = document.querySelector('sym-context[ctx="DATA"]');
        return owner && Reflect.get(owner, '$').note === 'Working note';
      });
      await page.locator('agui-theme-selector > button:not(:disabled)').click();
      await page.locator('.agui-theme-option[value="ocean"]').click();
      await page.waitForFunction(() => document.body.dataset.palette === 'ocean');
      await page.keyboard.press('Escape');
      await page.locator('agui-theme-toggle button').click();
      await page.locator('agui-header ::-p-aria([name="Note actions"][role="button"])').click();
      await page.locator('agui-sidebar[side="end"] ::-p-aria([name="Clear note"][role="button"])').click();
      assert.equal(await page.$eval('textarea', (field) => field.value), '');
      await page.locator('agui-sidebar[side="end"] ::-p-aria([name="Close"][role="button"])').click();
      await page.reload();
      await page.waitForSelector('textarea');
      assert.equal(await page.$eval('textarea', (field) => field.value), '');
    } finally {
      await page.close();
      await cli([
        'stop',
        id,
      ]);
      sessions.delete(id);
    }
    let shell = size(starter ? '' : sources['from-scratch.html']);
    let configuration = size(starter ? sources['config.json'] : '');
    let description = size(sources['description.md']);
    results.push({
      approach: id,
      shell,
      configuration,
      featureChunks: size(''),
      description,
      total: {
        bytes: shell.bytes + configuration.bytes + description.bytes,
        lines: shell.lines + configuration.lines + description.lines,
      },
      setupCommands: setup.length,
      cliElapsedMs: elapsedMs,
      cliResponseBytes: responseBytes,
      browserBehaviorVerified: true,
      authoringTokens: null,
    });
  }
  let report = {
    brief,
    method: 'Feature-equivalent reference fixtures, not independent agent runs. Counts include authored app source and a shared task description. Existing library and materialized template code are excluded. Setup timing is CLI execution only, after dependencies are installed; authoring time and per-approach model tokens are not available.',
    starterDiscovery: discovery,
    results,
  };
  await writeFile(new URL('comparison.json', output), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} finally {
  await browser?.close();
  for (let id of sessions) {
    await cli([
      'stop',
      id,
    ]).catch(() => {});
  }
  await rm(temporary, {
    recursive: true,
    force: true,
  });
}
