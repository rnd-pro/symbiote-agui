import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { core } from '../../src/connectors/core.js';
import { temporaryState } from './state-fixture.js';
import { saveDefinition } from '../../src/library/catalog.js';
import { cli } from '../browser/helpers.js';

/** @param {import('node:test').TestContext} t */
export async function connectorFixture(t) {
  let state = await temporaryState();
  let previous = process.env.AGENT_CONNECTORS_HOME;
  let coreRoot = join(state.directory, 'connector-core');
  process.env.AGENT_CONNECTORS_HOME = coreRoot;
  /** @type {Array<() => unknown | Promise<unknown>>} */
  let cleanups = [];
  t.after(async () => {
    try {
      for (let cleanup of cleanups.reverse()) { await cleanup(); }
    } finally {
      if (previous === undefined) { delete process.env.AGENT_CONNECTORS_HOME; }
      else { process.env.AGENT_CONNECTORS_HOME = previous; }
      await state.close();
    }
  });
  let collection = join(state.directory, 'scripts');
  await core.initializeRegistry(collection);
  await core.changeConnection(coreRoot, 'fixture', collection);
  let registry = await core.FileRegistry.open(collection, coreRoot);
  let created = (await registry.create('example.records.save', 'example', 'write')).result;
  let directory = join(collection, created.path);
  let log = join(state.directory, 'writes.jsonl');
  let manifestPath = join(directory, 'connector.json');
  let manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.inputSchema = {
    type: 'object',
    required: [
      'value',
    ],
    properties: {
      value: {
        type: 'string',
      },
      delay: {
        type: 'integer',
        minimum: 0,
        maximum: 15000,
      },
    },
    additionalProperties: false,
  };
  manifest.outputSchema = {
    type: 'object',
    required: [
      'value',
      'requestId',
    ],
    properties: {
      value: {
        type: 'string',
      },
      requestId: {
        type: 'string',
      },
    },
    additionalProperties: false,
  };
  await writeFile(manifestPath, JSON.stringify(manifest));
  await writeFile(join(directory, 'index.js'), `import { appendFile } from 'node:fs/promises';
export async function execute(input, context) {
  if (input.delay) { await new Promise(resolve => setTimeout(resolve, input.delay)); }
  await appendFile(${JSON.stringify(log)}, JSON.stringify({ requestId: context.requestId, value: input.value }) + '\\n');
  return context.verified({ value: input.value, requestId: context.requestId });
}`);
  let prepared = (await registry.prepare('example.records.save')).result;
  await registry.bind('example.records.save', created.scriptId, prepared.revision);
  let html = join(state.directory, 'fixture.html');
  await writeFile(html, '<p>Connector test fixture.</p>');

  /** @param {string} [id] */
  async function attach(id = 'backend') {
    await saveDefinition(id, html);
    await cli('connector', 'attach', id, 'save', '--registry', collection, '--script', 'example.records.save');
  }
  /**
   * @param {string} id
   * @param {'agent' | 'agui'} source
   */
  async function grant(id, source) {
    return cli('connector', 'grant', id, 'save', '--revision', prepared.revision, '--source', source);
  }
  return {
    ...state,
    collection,
    coreRoot,
    registry,
    prepared,
    sourceDirectory: directory,
    html,
    log,
    attach,
    grant,
    /** @param {() => unknown | Promise<unknown>} cleanup */
    cleanup: (cleanup) => { cleanups.push(cleanup); },
  };
}
