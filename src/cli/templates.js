import { CommandError } from '../shared/command-error.js';
import { readMarkup } from '../markup/read-input.js';
import { assertSessionId } from '../sessions/identity.js';
import { scanAssets } from '../assets/inventory.js';
import { assertTemplateId, listTemplates, loadTemplate } from '../templates/catalog.js';
import { TEMPLATE_COMMANDS } from '../templates/constants.js';
import { createTemplate } from '../templates/create.js';

/**
 * @param {string[]} positionals
 * @param {Record<string, string | boolean | undefined>} values
 * @returns {import('../../types/templates.js').TemplateCliRequest | undefined}
 */
export function parseTemplateCommand(positionals, values) {
  if (positionals[0] !== 'templates') { return; }
  let command = positionals[1];
  if (!Object.hasOwn(TEMPLATE_COMMANDS, command || '')) {
    throw new CommandError('Use templates list, templates describe <TEMPLATE_ID>, or templates create <TEMPLATE_ID> <SESSION_ID>.');
  }
  let definition = TEMPLATE_COMMANDS[/** @type {keyof typeof TEMPLATE_COMMANDS} */ (command)];
  let allowed = /** @type {string[]} */ (definition.options);
  let length = command === 'list' ? 2 : command === 'describe' ? 3 : 4;
  if (positionals.length !== length || Object.entries(values).some(([
    key,
    value,
  ]) => !allowed.includes(key) || value === '')) {
    throw new CommandError(`Usage: symbiote-agui ${definition.usage}`);
  }
  if (command === 'list') {
    return {
      kind: 'template',
      command,
      query: /** @type {string | undefined} */ (values.query),
    };
  }
  let templateId = positionals[2];
  assertTemplateId(templateId);
  if (command === 'describe') {
    return {
      kind: 'template',
      command,
      templateId,
    };
  }
  let sessionId = positionals[3];
  assertSessionId(sessionId);
  return {
    kind: 'template',
    command: 'create',
    templateId,
    sessionId,
    config: /** @type {string | undefined} */ (values.config),
  };
}

/**
 * @param {import('../../types/templates.js').TemplateCliRequest} request
 * @returns {Promise<import('../../types/templates.js').TemplateResult>}
 */
export async function runTemplateCommand(request) {
  if (request.command === 'list') {
    let templates = await listTemplates(request.query);
    return {
      total: templates.length,
      templates,
    };
  }
  if (request.command === 'describe') {
    let template = await loadTemplate(request.templateId);
    return {
      template: template.descriptor,
      defaults: template.defaults,
      description: template.description,
      assets: (await scanAssets(template.assetsPath)).entries,
    };
  }
  let configuration = {};
  if (request.config !== undefined) {
    let source = await readMarkup(request.config);
    try { configuration = JSON.parse(source); }
    catch { throw new CommandError('Template configuration must be valid JSON.'); }
  }
  return createTemplate(request.templateId, request.sessionId, configuration);
}
