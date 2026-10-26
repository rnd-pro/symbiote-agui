import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { getDefaultStateRoot, isProcessAlive } from '../sessions/store.js';
import { hasErrorCode } from '../shared/system-error.js';
import { readManager, releaseManager } from './registry.js';
import { stopManagerRecord } from './client.js';

export async function retireFolderManagers() {
  let directory = join(getDefaultStateRoot(), '.libraries');
  let entries = await readdir(directory).catch((error) => {
    if (hasErrorCode(error, 'ENOENT')) { return []; }
    throw error;
  });
  for (let entry of entries) {
    if (!/^[a-f0-9]{64}$/.test(entry)) { continue; }
    let record = await readManager(join(directory, entry));
    if (!record) { continue; }
    if (isProcessAlive(record.pid)) { await stopManagerRecord(record); }
    else { await releaseManager(record); }
  }
}
