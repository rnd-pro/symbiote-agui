import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { initializeRegistry, FileRegistry, defaultStateRoot, setCredentialProfile } from 'agent-connectors';

/**
 * Create only a new demo folder, without granting or running any connector.
 * @param {string} directory
 */
export async function setupExample(directory) {
  let root = resolve(directory);
  await mkdir(root);
  let collection = join(root, 'registry');
  await initializeRegistry(collection);
  let registry = await FileRegistry.open(collection, defaultStateRoot());
  let recordSchema = {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        enum: [
          'record-1',
          'record-2',
        ],
      },
      label: {
        type: 'string',
        maxLength: 120,
      },
    },
    required: [
      'id',
      'label',
    ],
    additionalProperties: false,
  };
  let modelSchema = {
    type: 'object',
    properties: {
      records: {
        type: 'array',
        items: recordSchema,
        maxItems: 2,
      },
      draft: recordSchema,
    },
    required: [
      'records',
      'draft',
    ],
    additionalProperties: false,
  };
  let draft = {
    id: 'record-1',
    label: 'First example record',
  };
  let dataPath = join(root, 'records.json');
  await writeFile(dataPath, `${JSON.stringify({
    records: [
      draft,
      {
        id: 'record-2',
        label: 'Second example record',
      },
    ],
    draft,
  }, null, 2)}\n`, {
    flag: 'wx',
  });
  let profile = `agui-example-${randomUUID()}`;
  await setCredentialProfile(defaultStateRoot(), profile, {
    DATA_FILE: dataPath,
  });
  let actions = [];
  for (let command of [
    'read',
    'save',
  ]) {
    let address = `example.records.${command}`;
    let effect = /** @type {'read' | 'write'} */ (command === 'read' ? 'read' : 'write');
    let created = (await registry.create(address, 'example', effect)).result;
    let folder = join(collection, created.path);
    let manifestPath = join(folder, 'connector.json');
    let manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.credentials = [
      'DATA_FILE',
    ];
    manifest.access.files = [
      'Read or write the local example data file configured by DATA_FILE.',
    ];
    manifest.inputSchema = effect === 'write' ? recordSchema : {
      type: 'object',
      additionalProperties: false,
    };
    manifest.outputSchema = modelSchema;
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    await writeFile(join(folder, 'index.js'), await readFile(new URL(`./${command}.js`, import.meta.url), 'utf8'));
    await writeFile(join(folder, 'description.md'), `# Example records ${command}\n\nUses only the private DATA_FILE profile reference. ${effect === 'write' ? 'Saves one edited record and verifies it by reading the file back.' : 'Reads the current example records and draft.'}\n`);
    let prepared = (await registry.prepare(address)).result;
    await registry.bind(address, prepared.scriptId, prepared.revision);
    actions.push({
      action: command,
      address,
      revision: prepared.revision,
    });
  }
  await writeFile(join(root, 'records.html'), await readFile(new URL('./records.html', import.meta.url), 'utf8'));
  await writeFile(join(root, 'records.md'), await readFile(new URL('./records.md', import.meta.url), 'utf8'));
  return {
    directory: root,
    registry: collection,
    profile,
    actions,
  };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  if (!process.argv[2]) { throw new Error('Provide a new example directory.'); }
  console.log(JSON.stringify(await setupExample(process.argv[2]), null, 2));
}
