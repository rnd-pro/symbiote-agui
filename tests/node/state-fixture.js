import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export async function temporaryState() {
  let previous = process.env.AGUI_STATE_DIR;
  let directory = await mkdtemp(join(tmpdir(), 'agui-test-'));
  process.env.AGUI_STATE_DIR = directory;

  return {
    directory,
    async close() {
      if (previous === undefined) {
        delete process.env.AGUI_STATE_DIR;
      } else {
        process.env.AGUI_STATE_DIR = previous;
      }
      await rm(directory, { recursive: true, force: true });
    },
  };
}
