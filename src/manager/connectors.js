import { CommandError } from '../shared/command-error.js';
import { assertSessionId } from '../sessions/identity.js';
import { runConnectorCommand } from '../connectors/service.js';
import { validateConnectorChange } from '../connectors/validate.js';
import { MANAGER_CONNECTOR_OPERATIONS } from './connector-operations.js';

export { MANAGER_CONNECTOR_OPERATIONS };

/** @param {import('../../types/manager.js').ManagerRequest} request */
export function validateManagerConnectors(request) {
  if (!Object.hasOwn(MANAGER_CONNECTOR_OPERATIONS, request.operation)) {
    if (request.connectorChange !== undefined || request.connectorInstanceId !== undefined) { throw new CommandError('Connector fields require a connector operation.'); }
    return false;
  }
  let changing = request.operation === 'connector change';
  let allowed = [
    'id',
    'operation',
    'sessionId',
    ...(changing ? [
      'confirm',
      'connectorInstanceId',
      'connectorChange',
    ] : []),
  ];
  if (Object.keys(request).some((key) => !allowed.includes(key)) || typeof request.sessionId !== 'string'
    || changing && (request.confirm !== true || !Object.hasOwn(request, 'connectorInstanceId')
      || request.connectorInstanceId !== null && typeof request.connectorInstanceId !== 'string')) {
    throw new CommandError('Connector controls require one session and confirmation with its observed lifecycle identity.');
  }
  assertSessionId(request.sessionId);
  if (changing) { managerConnectorChange(request.connectorChange); }
  return true;
}

/**
 * @param {unknown} input
 * @param {string} [cwd]
 */
function managerConnectorChange(input, cwd = process.cwd()) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || 'cwd' in input) { throw new CommandError('Invalid connector settings.'); }
  let change = validateConnectorChange({
    ...input,
    ...('command' in input && (input.command === 'attach' || input.command === 'update' && 'registry' in input) ? {
      cwd,
    } : {}),
  });
  if (change.command === 'list' || change.command === 'status') { throw new CommandError('Use connector status to inspect settings.'); }
  return change;
}

/**
 * @param {import('../../types/manager.js').ManagerRequest} request
 * @param {import('../../types/manager.js').ManagerRecord | undefined} record
 * @returns {Promise<import('../../types/manager.js').ManagerResult>}
 */
export async function runManagerConnectors(request, record) {
  let sessionId = request.sessionId || '';
  let change = request.operation === 'connector change' ? managerConnectorChange(request.connectorChange, record?.projectDirectory) : undefined;
  let result = change ? await runConnectorCommand({
    kind: 'connector',
    command: change.command,
    sessionId,
    values: {},
  }, {
    change,
    expectedInstanceId: request.connectorInstanceId,
  }) : undefined;
  let status = await runConnectorCommand({
    kind: 'connector',
    command: 'status',
    sessionId,
    values: {},
  });
  return {
    ok: true,
    connectorSettings: {
      sessionId,
      instanceId: status.connectors?.instanceId ?? null,
      status: /** @type {import('../../types/connectors.js').ConnectorInspection} */ (status.connectorControl),
      ...(change?.command === 'review' || change?.command === 'describe' ? {
        review: /** @type {import('../../types/connectors.js').ConnectorReview} */ (result?.connectorControl),
      } : {}),
    },
  };
}
