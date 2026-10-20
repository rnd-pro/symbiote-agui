import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export async function temporaryState() {
  let previous = process.env.AGUI_STATE_DIR;
  let previousLibrary = process.env.AGUI_LIBRARY_DIR;
  let previousWorker = process.env.AGUI_WORKER_STATE_DIR;
  let directory = await realpath(await mkdtemp(join(tmpdir(), 'agui-test-')));
  process.env.AGUI_STATE_DIR = directory;
  process.env.AGUI_LIBRARY_DIR = '';
  delete process.env.AGUI_WORKER_STATE_DIR;

  return {
    directory,
    async close() {
      if (previousLibrary === undefined) { delete process.env.AGUI_LIBRARY_DIR; }
      else { process.env.AGUI_LIBRARY_DIR = previousLibrary; }
      if (previousWorker === undefined) { delete process.env.AGUI_WORKER_STATE_DIR; }
      else { process.env.AGUI_WORKER_STATE_DIR = previousWorker; }
      if (previous === undefined) {
        delete process.env.AGUI_STATE_DIR;
      } else {
        process.env.AGUI_STATE_DIR = previous;
      }
      await rm(directory, { recursive: true, force: true });
    },
  };
}
