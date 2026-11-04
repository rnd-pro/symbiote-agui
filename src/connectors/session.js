import { core, assertConnectorCore } from './core.js';
import { CONNECTOR_LIMITS } from './constants.js';
import { emptyConnectors, validateConnectorChange, validateConnectorReference } from './validate.js';
import { connectorFingerprints, connectorScope, readConnectorPrivate, readConnectorSnapshot, saveConnectorPrivate } from './store.js';
import { configureConnectors, resolveRequirement, revokeAction } from './configure.js';
import { CommandError } from '../shared/command-error.js';

export class SessionConnectors {
  policy = emptyConnectors();
  /** @type {string | undefined} */
  raw;
  /** @type {import('../../types/connectors.js').ConnectorPrivate} */
  settings = {
    version: 1,
    epoch: '',
    routes: {},
    accepted: {},
  };
  closing = false;
  /** @type {Map<string, { action: string; fingerprint: string; controller: AbortController; promise: Promise<import('../../types/connectors.js').ConnectorResult> }>} */
  pending = new Map();

  /**
   * @param {string} sessionId
   * @param {() => { instanceId?: string; markupRevision: number }} identity
   */
  constructor(sessionId, identity) {
    assertConnectorCore();
    this.sessionId = sessionId;
    this.identity = identity;
    this.coreRoot = core.defaultStateRoot();
  }

  async initialize() {
    let snapshot = await readConnectorSnapshot(this.sessionId);
    this.settings = await readConnectorPrivate(this.sessionId);
    let fingerprints = connectorFingerprints(snapshot.policy);
    for (let action of new Set([
      ...Object.keys(this.settings.accepted),
      ...Object.keys(fingerprints),
    ])) {
      if (this.settings.accepted[action] !== fingerprints[action]) { await revokeAction(this, action); }
    }
    let existed = Object.keys(this.settings.accepted).length > 0;
    this.settings.accepted = fingerprints;
    if (snapshot.policy.actions.length || existed) { await saveConnectorPrivate(this.sessionId, this.settings); }
    this.policy = snapshot.policy;
    this.raw = snapshot.raw;
  }

  /** @returns {import('../../types/connectors.js').ConnectorStatus} */
  status() {
    return {
      version: 1,
      contractVersion: core.CONTRACT_VERSION,
      ...this.identity(),
      available: !!this.identity().instanceId && !this.closing,
      localOnly: true,
      pending: this.pending.size,
      actions: structuredClone(this.policy.actions),
    };
  }

  /** @param {unknown} input */
  async configure(input) {
    let change = validateConnectorChange(input);
    if (this.closing) { throw new CommandError('Connector operations are closing.'); }
    if ((await readConnectorSnapshot(this.sessionId)).raw !== this.raw) {
      throw new CommandError('Saved connector requirements changed. Sync before editing them.');
    }
    let result = await configureConnectors(this, change);
    if (new Set([
      'attach',
      'update',
      'detach',
    ]).has(change.command)) {
      this.settings.accepted = connectorFingerprints(this.policy);
      await saveConnectorPrivate(this.sessionId, this.settings);
    }
    this.raw = (await readConnectorSnapshot(this.sessionId)).raw;
    return result;
  }

  /**
   * @param {import('../../types/connectors.js').ConnectorReference} reference
   * @param {unknown} error
   * @returns {import('../../types/connectors.js').ConnectorResult}
   */
  failure(reference, error) {
    let code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && /^[A-Z_]{1,64}$/.test(error.code)
      ? error.code : 'CONNECTOR_FAILED';
    return {
      action: reference.action,
      requestId: reference.requestId,
      instanceId: reference.instanceId,
      state: 'rejected',
      code,
    };
  }

  /**
   * @param {unknown} input
   * @param {'agent' | 'agui'} source
   */
  admit(input, source) {
    let call = validateConnectorReference(input, true);
    if (this.closing || call.instanceId !== this.identity().instanceId || call.markupRevision !== this.identity().markupRevision) {
      throw new CommandError('Stale connector worker or markup identity.');
    }
    let requirement = this.policy.actions.find((entry) => entry.name === call.action);
    if (!requirement || requirement.revision !== call.revision) { throw new CommandError('Unknown connector action or stale pinned revision.'); }
    let serialized = JSON.stringify(call);
    if (Buffer.byteLength(serialized) > CONNECTOR_LIMITS.messageBytes || Buffer.byteLength(JSON.stringify(call.input)) > CONNECTOR_LIMITS.inputBytes) {
      throw new CommandError('Connector input is too large.');
    }
    let captured = /** @type {import('../../types/connectors.js').ConnectorCall} */ (JSON.parse(serialized));
    let fingerprint = `${source}:${serialized}`;
    let previous = this.pending.get(call.requestId);
    if (previous) {
      if (previous.fingerprint !== fingerprint) { throw new CommandError('Request ID already identifies another connector call.'); }
      return {
        promise: previous.promise,
      };
    }
    if (this.pending.size >= CONNECTOR_LIMITS.pending) { throw new CommandError('Too many pending connector calls.'); }
    let controller = new AbortController();
    let promise = this.execute(captured, requirement, source, controller.signal).finally(() => this.pending.delete(call.requestId));
    this.pending.set(call.requestId, {
      action: call.action,
      fingerprint,
      controller,
      promise,
    });
    return {
      promise,
    };
  }

  /**
   * @param {import('../../types/connectors.js').ConnectorCall} call
   * @param {import('../../types/connectors.js').ConnectorRequirement} requirement
   * @param {'agent' | 'agui'} source
   * @param {AbortSignal} signal
   * @returns {Promise<import('../../types/connectors.js').ConnectorResult>}
   */
  async execute(call, requirement, source, signal) {
    let reference = {
      action: call.action,
      requestId: call.requestId,
      instanceId: call.instanceId,
    };
    let invoked = false;
    try {
      let {
        registry,
        resolved,
      } = await resolveRequirement(this, requirement);
      // The native runner resolves metadata through show(). Freeze that lookup
      // for this invocation so a concurrent alias edit cannot change its target.
      let pinned = /** @type {import('../../types/connectors.js').CoreRegistry} */ (Object.create(registry));
      pinned.show = async () => structuredClone(resolved);
      invoked = true;
      let receipt = await core.runCapability(pinned, requirement.address, call.input, {
        scope: connectorScope(this.sessionId, this.settings, call.action),
        requestId: call.requestId,
        source,
        signal,
      });
      return {
        ...reference,
        revision: receipt.revision,
        state: receipt.state,
        ...(receipt.code ? {
          code: receipt.code,
        } : {}),
        ...(receipt.state === 'completed' ? {
          value: receipt.value,
        } : {}),
      };
    } catch (error) {
      let failure = this.failure(reference, error);
      let beforeExecution = new Set([
        'ACCESS_DENIED',
        'CREDENTIALS_CHANGED',
        'CREDENTIALS_MISSING',
        'INPUT_INVALID',
        'INVALID_INPUT',
        'NOT_PREPARED',
        'REQUEST_CONFLICT',
        'EXECUTION_BUSY',
        'RECEIPTS_FULL',
        'CANCELLED',
      ]);
      return invoked && !beforeExecution.has(failure.code || '') ? {
        ...failure,
        state: 'unknown',
      } : failure;
    }
  }

  /**
   * @param {unknown} input
   * @param {'agui' | undefined} [source]
   * @returns {Promise<import('../../types/connectors.js').ConnectorResult>}
   */
  async read(input, source) {
    let reference = validateConnectorReference(input, false);
    if (reference.instanceId !== this.identity().instanceId) { throw new CommandError('Stale connector worker identity.'); }
    let receipt = await core.getReceipt(this.coreRoot, reference.requestId);
    if (receipt.scope !== connectorScope(this.sessionId, this.settings, reference.action) || (source && receipt.source !== source)) {
      throw new CommandError('Connector receipt belongs to another action or session scope.');
    }
    return {
      action: reference.action,
      requestId: reference.requestId,
      instanceId: reference.instanceId,
      revision: receipt.revision,
      state: receipt.state,
      ...(receipt.code ? {
        code: receipt.code,
      } : {}),
      ...(receipt.state === 'completed' ? {
        value: receipt.value,
      } : {}),
    };
  }

  async reload() {
    await this.initialize();
  }

  async cancel() {
    for (let entry of this.pending.values()) { entry.controller.abort(); }
    await Promise.allSettled([...this.pending.values()].map((entry) => entry.promise));
  }

  async close() {
    this.closing = true;
    await this.cancel();
  }
}
