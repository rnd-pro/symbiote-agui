import { readInitialData } from '../../uilib/shared/initial-data.js';
import { DATA_SELECTOR } from '../../uilib/shared/constants.js';
import { ICON_NAMES } from '../../uilib/content/icon/collection.js';
import { ASSET_PATH } from '../assets/constants.js';
import { assetPath } from '../assets/paths.js';
import { jsonData } from '../data/validate.js';
import { writeDataScript } from '../data/targets.js';
import { analyzeMarkup } from '../markup/analyze.js';
import { parseMarkup, serializeMarkup } from '../markup/parse.js';
import { MAX_HTML_BYTES } from '../markup/constants.js';
import { CommandError } from '../shared/command-error.js';
import { validateSchema } from '../shared/schema.js';
import { loadTemplate } from './catalog.js';

/**
 * @param {import('../../types/templates.js').TemplateDescriptor} descriptor
 * @param {unknown} input
 * @returns {asserts input is import('../../types/templates.js').TemplateConfiguration}
 */
function validateConfiguration(descriptor, input) {
  try { jsonData(input); }
  catch { throw new CommandError('Template configuration must be plain, bounded JSON data.'); }
  validateSchema(descriptor.configuration, input, {
    schemaError: `Invalid configuration schema for template ${descriptor.id}.`,
    inputError: 'Template configuration does not match its schema',
  });
}

/** @param {unknown} input */
function validateRoutes(input) {
  // The template schema validates route fields; this adds cross-entry constraints.
  let routes = /** @type {Record<string, import('../../uilib/types/uilib.js').UiNavRoute & { default?: boolean }>} */ (input);
  if (Object.values(routes).filter((route) => route.default).length !== 1) {
    throw new CommandError('Template routes require exactly one default section.');
  }
  for (let route of Object.values(routes)) {
    let prefix = `./${ASSET_PATH}/`;
    if (typeof route.src !== 'string' || !route.src.startsWith(prefix) || !/\.html?$/.test(route.src)) {
      throw new CommandError('Template section sources must be local HTML assets.');
    }
    assetPath(route.src.slice(prefix.length));
    if (route.icon !== undefined && (typeof route.icon !== 'string' || !Object.hasOwn(ICON_NAMES, route.icon))) {
      throw new CommandError('Choose a supported library icon for the template section.');
    }
  }
}

/**
 * Prepare ordinary markup and data; saving and starting remain host operations.
 * @param {string} id
 * @param {unknown} [input]
 * @returns {Promise<import('../../types/templates.js').RenderedTemplate>}
 */
export async function renderTemplate(id, input = {}) {
  let template = await loadTemplate(id);
  validateConfiguration(template.descriptor, template.defaults);
  validateConfiguration(template.descriptor, input);
  let fragment = parseMarkup(template.html);
  /** @type {import('../../types/templates.js').TemplateConfiguration} */
  let configuration = {};
  for (let [
    context,
    defaults,
  ] of Object.entries(template.defaults)) {
    let providers = fragment.content.querySelectorAll(`sym-context[ctx="${context}"], sym-router[ctx="${context}"]`);
    if (providers.length !== 1) { throw new CommandError(`Template requires one ${context} provider.`); }
    let provider = providers[0];
    let script = provider.querySelector(DATA_SELECTOR);
    if (!script) { throw new CommandError(`Template requires inline JSON for ${context}.`); }
    let values = {
      ...defaults,
      ...input[context],
    };
    if (provider.localName === 'sym-router') { validateRoutes(values.routes); }
    configuration[context] = values;
    writeDataScript(script, {
      ...readInitialData(provider),
      ...values,
    });
  }
  let html = serializeMarkup(fragment);
  if (Buffer.byteLength(html) > MAX_HTML_BYTES) { throw new CommandError('Template markup exceeds the HTML size limit.'); }
  analyzeMarkup(html);
  return {
    descriptor: template.descriptor,
    configuration,
    html,
    assetsPath: template.assetsPath,
  };
}
