import { readFile } from 'node:fs/promises';
import { getSettings } from '../config/settings.js';
import { definitionPaths } from '../library/paths.js';
import { metadataPath } from '../metadata/store.js';
import { validateMetadata } from '../metadata/validate.js';
import { isProcessAlive, getStateRoot, readSession } from '../sessions/store.js';
import { assertSessionId } from '../sessions/identity.js';
import { withSessionLock } from '../sessions/storage-lock.js';
import { withAssetLock } from '../assets/lock.js';
import { snapshotAssetTree } from '../assets/manifest.js';
import { rememberProject } from '../projects/registry.js';
import { projectEntry } from '../projects/identity.js';
import { assertDestinationEmpty } from '../projects/transfer/scope.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE } from '../shared/constants.js';
import { renderTemplate } from './render.js';
import { publishTemplate } from './publication.js';

/**
 * @param {string} templateId
 * @param {string} sessionId
 * @param {unknown} [configuration]
 * @param {Parameters<typeof publishTemplate>[4]} [hooks]
 * @returns {Promise<import('../../types/templates.js').TemplateCreation>}
 */
export async function createTemplate(templateId, sessionId, configuration = {}, hooks) {
  assertSessionId(sessionId);
  if (sessionId === 'all') { throw new CommandError('The ID all is reserved for bulk session controls. Choose another ID.'); }
  // Validate every input and source asset before storage locks create directories.
  let rendered = await renderTemplate(templateId, configuration);
  let assets = await snapshotAssetTree(rendered.assetsPath);
  let manifest = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  let metadata = validateMetadata({
    template: {
      id: rendered.descriptor.id,
      packageVersion: manifest.version,
    },
  });
  let paths = definitionPaths(sessionId);
  let settings = getSettings();
  let root = getStateRoot();
  return withSessionLock(sessionId, () => withAssetLock(sessionId, async () => {
    let worker = await readSession(sessionId);
    if (worker && isProcessAlive(worker.pid)) {
      throw new CommandError(`Session ${sessionId} is running or starting. Choose another ID.`, ERROR_CODE.SESSION_EXISTS);
    }
    await assertDestinationEmpty({
      ...projectEntry(settings.folder),
      stateRoot: root,
    }, sessionId);
    await rememberProject(settings.folder);
    await publishTemplate(rendered.assetsPath, paths.assetsPath, assets, [
      {
        path: metadataPath(sessionId),
        text: `${JSON.stringify(metadata)}\n`,
      },
      {
        path: paths.descriptionPath,
        text: `# ${sessionId}\n\n${rendered.description}`,
      },
      {
        path: paths.htmlPath,
        text: rendered.html,
      },
    ], hooks);
    return {
      sessionId,
      created: true,
      active: false,
      template: /** @type {import('../../types/templates.js').TemplateProvenance} */ (metadata.template),
      htmlPath: paths.htmlPath,
      descriptionPath: paths.descriptionPath,
      assetsPath: paths.assetsPath,
      metadataPath: metadataPath(sessionId),
      nextCommand: `npx symbiote-agui start ${sessionId}`,
      requirements: [
        'Complete the session purpose, actual data sources, and saving rules in its description before presenting it as ready.',
        'Check feedback delivery for the current conversation before editing, or obtain acceptance of the existing fallback workflow.',
      ],
    };
  }));
}
