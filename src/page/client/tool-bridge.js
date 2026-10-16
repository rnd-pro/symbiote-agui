import { listPageTools, executePageTool } from './tools.js';
import { TOOL_DISCOVERY_TIMEOUT_MS, TOOL_DISCOVERY_QUIET_MS } from '../../transport/constants.js';

export class ToolBridge {
  revision = 0;
  fingerprint = '';
  discoveryId = '';

  invalidate() {
    this.revision += 1;
  }

  snapshot() {
    let tools = listPageTools();
    let fingerprint = JSON.stringify({ revision: this.revision, tools });
    if (fingerprint !== this.fingerprint) {
      this.fingerprint = fingerprint;
      this.discoveryId = crypto.randomUUID();
    }
    return { discoveryId: this.discoveryId, tools };
  }

  async discover() {
    let deadline = Date.now() + TOOL_DISCOVERY_TIMEOUT_MS;
    let previous = this.snapshot();
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, TOOL_DISCOVERY_QUIET_MS));
      let current = this.snapshot();
      if (current.discoveryId === previous.discoveryId) { return current; }
      previous = current;
    }
    throw new Error('Tool discovery did not settle. Wait for the interface to finish updating, then rediscover.');
  }

  /** @param {Extract<import('../../../types/transport.js').PageCommand, { type: 'call' }>} command */
  async execute(command) {
    if (Date.now() >= command.deadline) {
      throw new Error('Tool call expired before execution. It was not started.');
    }
    let current = this.snapshot();
    if (current.discoveryId !== command.discoveryId) {
      throw new Error('The tool catalog changed. Rediscover tools before calling.');
    }
    if (!current.tools.some((tool) => tool.name === command.name && tool.active)) {
      throw new Error(`Tool ${command.name} is unavailable. Rediscover tools.`);
    }
    return executePageTool(command.name, command.input);
  }
}
