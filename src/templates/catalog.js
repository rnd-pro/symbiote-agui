import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { CommandError } from '../shared/command-error.js';
import { hasErrorCode } from '../shared/system-error.js';
import { TEMPLATE_ID_PATTERN } from './constants.js';
import { templateSchema } from './schema.js';

let root = new URL('../../templates/', import.meta.url);

/** @param {string} id */
export function assertTemplateId(id) {
  if (!TEMPLATE_ID_PATTERN.test(id)) {
    throw new CommandError('Choose a packaged template ID.');
  }
}

/** @param {string} id */
async function descriptor(id) {
  assertTemplateId(id);
  let folder = new URL(`${id}/`, root);
  let data;
  try {
    data = JSON.parse(await readFile(new URL('template.json', folder), 'utf8'));
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) { throw new CommandError(`Unknown app template: ${id}.`); }
    throw error;
  }
  if (data.id !== id || typeof data.title !== 'string' || typeof data.summary !== 'string'
    || !data.configuration || typeof data.configuration !== 'object' || Array.isArray(data.configuration)) {
    throw new CommandError(`Invalid packaged template descriptor: ${id}.`);
  }
  data.configuration = await templateSchema(data.configuration);
  return {
    folder,
    descriptor: /** @type {import('../../types/templates.js').TemplateDescriptor} */ (data),
  };
}

/**
 * @param {string} [query]
 * @returns {Promise<import('../../types/templates.js').TemplateSummary[]>}
 */
export async function listTemplates(query = '') {
  let entries = await readdir(root, {
    withFileTypes: true,
  });
  let summaries = [];
  for (let entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) { continue; }
    let {
      descriptor: item,
    } = await descriptor(entry.name);
    if (!`${item.id} ${item.title} ${item.summary}`.toLowerCase().includes(query.toLowerCase())) { continue; }
    summaries.push({
      id: item.id,
      title: item.title,
      summary: item.summary,
    });
  }
  return summaries;
}

/**
 * @param {string} id
 * @returns {Promise<import('../../types/templates.js').LoadedTemplate>}
 */
export async function loadTemplate(id) {
  let item = await descriptor(id);
  let [
    html,
    defaults,
    description,
  ] = await Promise.all([
    readFile(new URL('index.html', item.folder), 'utf8'),
    readFile(new URL('defaults.json', item.folder), 'utf8'),
    readFile(new URL('description.md', item.folder), 'utf8'),
  ]);
  return {
    descriptor: item.descriptor,
    defaults: JSON.parse(defaults),
    html,
    description,
    assetsPath: fileURLToPath(new URL('assets', item.folder)),
  };
}
