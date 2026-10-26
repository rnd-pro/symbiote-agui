import { setTimeout as delay } from 'node:timers/promises';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { readManager } from './registry.js';

/**
 * @param {import('../../types/manager.js').ManagerRecord} record
 * @param {'status' | 'stop'} action
 */
export async function requestManager(record, action) {
  if (!record.url) { throw new Error('Manager is still starting.'); }
  let response = await fetch(`${record.url}${action}`, {
    method: action === 'status' ? 'GET' : 'POST',
    headers: {
      authorization: `Bearer ${record.token}`,
    },
    redirect: 'error',
    signal: AbortSignal.timeout(2_000),
  });
  let identity = await response.json();
  if (!response.ok || identity.instanceId !== record.instanceId || identity.pid !== record.pid) {
    throw new Error('Manager identity did not match.');
  }
}

/** @param {import('../../types/manager.js').ManagerRecord} record */
export async function stopManagerRecord(record) {
  await requestManager(record, 'stop');
  for (let attempt = 0; attempt < 200; attempt += 1) {
    let current = await readManager(record.stateRoot);
    if (current?.instanceId !== record.instanceId) { return; }
    await delay(100);
  }
  throw new CommandError('Manager shutdown is still pending. Running sessions are unaffected.', ERROR_CODE.STOP_FAILED, EXIT_CODE.RUNTIME_ERROR);
}
