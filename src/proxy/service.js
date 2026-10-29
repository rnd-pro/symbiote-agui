import { withSessionLock } from '../sessions/storage-lock.js';
import { isProcessAlive, readSession } from '../sessions/store.js';
import { requestSession } from '../sessions/client.js';
import { SESSION_STATE } from '../sessions/constants.js';
import { readCachedMarkup } from '../sessions/cache.js';
import { CommandError } from '../shared/command-error.js';
import { changeProxyPolicy, readProxySnapshot } from './store.js';
import { proxyStatus, validateProxyChange } from './policy.js';

/** @param {import('../../types/proxy.js').ProxyCliRequest} request */
export async function runProxyCommand(request) {
  let change = request.command === 'status' ? undefined : validateProxyChange({
    command: request.command,
    origin: request.origin,
  });
  // Do not hold the process-external lock while asking the worker to acquire it.
  let selected = await withSessionLock(request.sessionId, async () => {
    let record = await readSession(request.sessionId);
    if (record && isProcessAlive(record.pid)) {
      return {
        record,
      };
    }
    if (await readCachedMarkup(request.sessionId) === undefined) { throw new CommandError(`No saved AGUI named ${request.sessionId}. Use save or insert first.`); }
    let { policy } = change ? await changeProxyPolicy(request.sessionId, change) : await readProxySnapshot(request.sessionId);
    return {
      result: {
        sessionId: request.sessionId,
        state: SESSION_STATE.STOPPED,
        active: false,
        proxy: proxyStatus(request.sessionId, policy),
      },
    };
  });
  if (selected.record) {
    return requestSession(selected.record, change ? 'proxy/change' : 'proxy', undefined, change ? JSON.stringify(change) : undefined);
  }
  return selected.result;
}
