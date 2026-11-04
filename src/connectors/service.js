import { createReadStream } from 'node:fs';
import { readUtf8Markup } from '../markup/read-input.js';
import { object, keys } from '../feedback/validate-shape.js';
import { withSessionLock } from '../sessions/storage-lock.js';
import { isProcessAlive, readSession } from '../sessions/store.js';
import { requestSession } from '../sessions/client.js';
import { readCachedMarkup } from '../sessions/cache.js';
import { SESSION_STATE } from '../sessions/constants.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { SessionConnectors } from './session.js';
import { validateConnectorChange } from './validate.js';
import { CONNECTOR_LIMITS } from './constants.js';

/** @param {import('../../types/connectors.js').ConnectorCliRequest} request */
function changeFor(request) {
  let values = request.values;
  let action = request.action;
  let base = {
    command: request.command,
    ...(action ? {
      action,
    } : {}),
  };
  let extras = {
    review: () => values.path ? {
      path: values.path,
    } : {},
    attach: () => ({
      registry: values.registry,
      address: values.script,
      cwd: process.cwd(),
    }),
    update: () => values.registry ? {
      registry: values.registry,
      cwd: process.cwd(),
    } : {},
    grant: () => ({
      revision: values.revision,
      source: values.source,
      ...(values.profile ? {
        profile: values.profile,
      } : {}),
      ...(values.timeout ? {
        timeoutMs: Number(values.timeout),
      } : {}),
      ...(values['result-bytes'] ? {
        resultBytes: Number(values['result-bytes']),
      } : {}),
    }),
  };
  return validateConnectorChange({
    ...base,
    ...(Object.hasOwn(extras, request.command) ? extras[/** @type {keyof typeof extras} */ (request.command)]() : {}),
  });
}

/**
 * @param {import('../../types/connectors.js').ConnectorCliRequest} request
 * @param {{ change?: import('../../types/connectors.js').ConnectorChange; expectedInstanceId?: string | null }} [options]
 * @returns {Promise<import('../../types/session.js').SessionStatus>}
 */
export async function runConnectorCommand(request, options = {}) {
  let command = request.command;
  let change = options.change ? validateConnectorChange(options.change)
    : command === 'call' || command === 'receipt' ? undefined : changeFor(request);
  let selected = await withSessionLock(request.sessionId, async () => {
    let record = await readSession(request.sessionId);
    let instanceId = record && isProcessAlive(record.pid) ? record.instanceId : null;
    if (options.expectedInstanceId !== undefined && options.expectedInstanceId !== instanceId) {
      throw new CommandError('The session lifecycle changed. Refresh connector settings before editing access.');
    }
    if (record && isProcessAlive(record.pid)) { return {
      record,
    }; }
    if (command === 'call' || command === 'receipt') { throw new CommandError('Start the session before calling or recovering its backend.', ERROR_CODE.SESSION_STOPPED, EXIT_CODE.RUNTIME_ERROR); }
    if (await readCachedMarkup(request.sessionId) === undefined) { throw new CommandError('Save a session definition before attaching connectors.'); }
    let service = new SessionConnectors(request.sessionId, () => ({
      markupRevision: 0,
    }));
    await service.initialize();
    let connectorControl = await service.configure(change);
    return {
      result: {
        sessionId: request.sessionId,
        state: SESSION_STATE.STOPPED,
        connectors: service.status(),
        connectorControl,
      },
    };
  });
  if (!selected.record) { return selected.result; }
  let record = selected.record;
  if (change) {
    return requestSession(record, 'connector/control', 35000, JSON.stringify({
      instanceId: record.instanceId,
      change,
    }));
  }
  let current = await requestSession(record, 'status');
  if (!current.connectors) { throw new CommandError('This worker does not support connectors. Preserve drafts before restarting.', ERROR_CODE.NOT_IMPLEMENTED); }
  let reference = {
    action: request.action,
    instanceId: record.instanceId,
    requestId: request.values.request,
  };
  if (command === 'receipt') { return requestSession(record, 'connector/receipt', 35000, JSON.stringify(reference)); }
  let stream = request.values.file ? createReadStream(request.values.file) : process.stdin;
  let input;
  try { input = JSON.parse(await readUtf8Markup(stream, CONNECTOR_LIMITS.messageBytes)); }
  catch { throw new CommandError('Connector call input must be bounded JSON.'); }
  finally { if (stream !== process.stdin) { stream.destroy(); } }
  object(input);
  keys(input, [
    'requestId',
    'input',
  ], [
    'instanceId',
    'markupRevision',
    'revision',
  ]);
  return requestSession(record, 'connector/call', CONNECTOR_LIMITS.executionMs + 10000, JSON.stringify({
    ...reference,
    ...input,
    markupRevision: input.markupRevision ?? current.connectors.markupRevision,
    revision: input.revision ?? current.connectors.actions.find((entry) => entry.name === request.action)?.revision,
  }));
}
