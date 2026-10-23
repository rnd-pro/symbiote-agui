import { execFile } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { temporaryState } from './state-fixture.js';

let execute = promisify(execFile);
let cliPath = fileURLToPath(new URL('../../bin/symbiote-agui.js', import.meta.url));

export async function temporaryManagerProject() {
  let state = await temporaryState();
  let projectDirectory = join(state.directory, 'project');
  await mkdir(projectDirectory);
  let environment = {
    ...process.env,
  };
  delete environment.AGUI_LIBRARY_DIR;
  delete environment.AGUI_WORKER_STATE_DIR;
  let scopes = new Set([
    '',
  ]);

  /**
   * @param {string[]} args
   * @param {string} [folder]
   */
  async function cli(args, folder) {
    let env = {
      ...environment,
    };
    if (folder !== undefined) { env.AGUI_LIBRARY_DIR = folder; scopes.add(folder); }
    let result = await execute(process.execPath, [
      cliPath,
      ...args,
    ], {
      cwd: projectDirectory,
      env,
      timeout: 45_000,
    });
    return JSON.parse(result.stdout);
  }

  return {
    directory: state.directory,
    projectDirectory,
    cli,
    async close() {
      try {
        let settings = await cli([
          'config',
          'show',
        ]).catch(() => undefined);
        if (settings?.settings.folder) { scopes.add(settings.settings.folder); }
        for (let folder of scopes) {
          await cli([
            'stop',
            'all',
          ], folder).catch(() => {});
          await cli([
            'manager',
            'stop',
          ], folder).catch(() => {});
        }
      } finally { await state.close(); }
    },
  };
}
