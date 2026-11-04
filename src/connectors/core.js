import * as core from 'agent-connectors';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';

export { core };

export function assertConnectorCore() {
  if (core.CONTRACT_VERSION !== 1 || typeof core.runCapability !== 'function' || typeof core.grantCapability !== 'function') {
    throw new CommandError('Connector core contract 1 with local execution support is required.', ERROR_CODE.NOT_IMPLEMENTED, EXIT_CODE.RUNTIME_ERROR);
  }
}
