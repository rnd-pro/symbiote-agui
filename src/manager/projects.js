import { CommandError } from '../shared/command-error.js';
import { PROJECT_OPERATIONS } from '../projects/constants.js';
import { assertProjectFolder, validFolder, validProjectId } from '../projects/identity.js';
import { connectProject, forgetProject, listProjects, registeredProject, rememberProject } from '../projects/registry.js';
import { openProjectFolder } from '../projects/open.js';
import { chooseProject } from '../projects/choose.js';
import { listProjectEntries } from '../projects/explorer/list.js';
import { previewProjectFile } from '../projects/explorer/preview.js';

/**
 * @param {import('../../types/manager.js').ManagerRequest} request
 */
export function validateProjectRequest(request) {
  let operation = PROJECT_OPERATIONS[/** @type {keyof typeof PROJECT_OPERATIONS} */ (request.operation)];
  if (!operation) { return false; }
  if (request.sessionId !== undefined || request.all !== undefined || request.confirm !== undefined
    || (operation.target === 'folder' ? !validFolder(request.folder) : request.folder !== undefined)
    || (operation.target === 'projectId' ? !validProjectId(request.projectId) : request.projectId !== undefined)) {
    throw new CommandError('Choose a folder for connection, or a registered project ID for navigation.');
  }
  return true;
}

/**
 * @param {import('../../types/manager.js').ManagerRequest} request
 * @param {import('../../types/manager.js').ManagerRecord | undefined} record
 * @param {import('../../types/manager.js').ManagerScope} scope
 * @returns {Promise<import('../../types/manager.js').ManagerResult>}
 */
export async function runProjectOperation(request, record, scope) {
  let directory = record?.projectDirectory || process.cwd();
  let operations = {
    'project entries': async () => ({
      ok: true,
      directory: await listProjectEntries(request.projectId || '', request.path, request.offset, request.showHidden),
    }),
    'project preview': async () => ({
      ok: true,
      preview: await previewProjectFile(request.projectId || '', request.path || '', request.showHidden),
    }),
    'open folder': () => openProjectFolder(request.projectId || ''),
    'choose project': () => chooseProject(directory),
    projects: async () => ({
      ok: true,
      projects: await listProjects(scope.settings.folder),
    }),
    'connect project': async () => ({
      ok: true,
      project: await connectProject(request.folder || '', directory),
    }),
    'forget project': async () => {
      await forgetProject(request.projectId || '', scope.settings.folder);
      return {
        ok: true,
        projects: await listProjects(scope.settings.folder),
      };
    },
    'switch project': async () => {
      let project = await registeredProject(request.projectId || '');
      if (project.folder) { await assertProjectFolder(project.folder); }
      await rememberProject(project.folder, true);
      return {
        ok: true,
        project: await registeredProject(project.id),
        projects: await listProjects(project.folder),
      };
    },
  };
  return operations[/** @type {keyof typeof operations} */ (request.operation)]();
}
