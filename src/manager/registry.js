import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, rmdir, writeFile } from 'node:fs/promises';
import { join, dirname, isAbsolute } from 'node:path';
import { getStateRoot, isProcessAlive } from '../sessions/store.js';
import { getSettings } from '../config/settings.js';
import { hasErrorCode } from '../shared/system-error.js';

function registryPath() { return join(getStateRoot(), '.manager'); }

/** @param {import('../../types/manager.js').ManagerRecord} record */
export function managerDirectory(record) { return join(registryPath(), record.instanceId); }

/** @returns {Promise<import('../../types/manager.js').ManagerRecord | undefined>} */
export async function readManager() {
  try {
    let entries = await readdir(registryPath());
    let instanceId = entries[0];
    if (entries.length !== 1 || !instanceId || !/^[a-f0-9-]{36}$/.test(instanceId)) { throw new Error('Invalid manager registry.'); }
    let record = JSON.parse(await readFile(join(registryPath(), instanceId, 'manager.json'), 'utf8'));
    if (record.instanceId !== instanceId || !/^[a-f0-9]{64}$/.test(record.token)
      || !Number.isSafeInteger(record.pid) || record.pid <= 0 || record.stateRoot !== getStateRoot()
      || record.settings?.folder !== getSettings().folder
      || (record.projectDirectory !== undefined && (typeof record.projectDirectory !== 'string' || !isAbsolute(record.projectDirectory)))
      || (record.url && !/^http:\/\/127\.0\.0\.1:[0-9]+\/manager\/$/.test(record.url))) {
      throw new Error('Invalid manager metadata.');
    }
    return record;
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) { return undefined; }
    throw error;
  }
}

/** @param {import('../../types/manager.js').ManagerRecord} record */
export async function writeManager(record) {
  let path = join(managerDirectory(record), 'manager.json');
  await writeFile(`${path}.tmp`, JSON.stringify(record), { mode: 0o600 });
  await rename(`${path}.tmp`, path);
}

/** @param {import('../../types/manager.js').ManagerRecord} record */
export async function releaseManager(record) {
  let path = managerDirectory(record);
  await rm(path, { force: true, recursive: true });
  await rmdir(dirname(path)).catch((error) => {
    if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].some((code) => hasErrorCode(error, code))) { throw error; }
  });
}

export async function reserveManager() {
  let existing = await readManager();
  if (existing && !isProcessAlive(existing.pid)) { await releaseManager(existing); }
  let root = getStateRoot();
  await mkdir(root, { recursive: true, mode: 0o700 });
  let pending = await mkdtemp(join(root, '.manager-pending-'));
  let record = {
    stateRoot: root,
    settings: getSettings(),
    projectDirectory: process.cwd(),
    instanceId: randomUUID(),
    token: randomBytes(32).toString('hex'),
    pid: process.pid,
  };
  try {
    let path = join(pending, record.instanceId);
    await mkdir(path, { mode: 0o700 });
    await writeFile(join(path, 'manager.json'), JSON.stringify(record), { mode: 0o600 });
    await rename(pending, registryPath());
    return record;
  } finally { await rm(pending, { recursive: true, force: true }); }
}
