import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from '../../shared/component.js';
import { callConnector, readConnectorReceipt, CONNECTOR_CONTEXT } from '../../../page/client/connectors.js';
import { feedbackSuppressed } from '../../shared/feedback-guard.js';

export class Connector extends UiComponent {
  processInnerHtml = true;
  destructionDelay = 0;
  disposed = false;
  autoLoaded = false;
  inputRevision = 0;
  publishing = false;
  /** @type {{ action: string; requestId: string; input: string; inputRevision: number; revision: string } | undefined} */
  operation;
  componentDescription = () => JSON.stringify({
    id: this.id,
    action: this.action,
  });
  init$ = {
    action: undefined,
    input: {},
    value: undefined,
    disabled: undefined,
    readonly: undefined,
    pending: false,
    unavailable: true,
    receiptUnavailable: true,
    outcome: 'idle',
    error: '',
    result: null,
    requestId: '',
    stale: false,
    run: new ToolDescriptor({
      description: 'Explicitly invoke this local connector with its bound input. Browser authority applies; agent CLI calls use connector call instead.',
      deps: [
        'unavailable',
      ],
      when: () => !this.$.unavailable,
      execute: () => this.run(),
    }),
    read_receipt: new ToolDescriptor({
      description: 'Reconcile this connector request without resubmitting its input.',
      deps: [
        'receiptUnavailable',
      ],
      when: () => !this.$.receiptUnavailable,
      execute: () => this.readReceipt(),
    }),
  };

  get action() { return String(this.$.action ?? this.getAttribute('action') ?? ''); }

  get requirement() {
    let status = /** @type {import('../../../../types/connectors.js').ConnectorStatus | null} */ (this.$[`${CONNECTOR_CONTEXT}/current`]);
    return status?.actions.find((entry) => entry.name === this.action);
  }

  get connected() { return !!this.$[`${CONNECTOR_CONTEXT}/connected`]; }

  renderCallback() {
    /** @type {string | undefined} */
    let previousInput;
    try { previousInput = JSON.stringify(this.$.input); } catch { /* Invalid input is rejected on run. */ }
    this.sub('input', (value) => {
      let input;
      try { input = JSON.stringify(value); } catch { /* Treat invalid input as a new draft. */ }
      let changed = input === undefined || input !== previousInput;
      previousInput = input;
      if (this.publishing || !changed) { return; }
      this.inputRevision += 1;
      if (this.operation) { this.$.stale = true; }
    }, false);
    for (let key of [
      'action',
      'disabled',
      'readonly',
      'attribute-action',
      'attribute-disabled',
      'attribute-readonly',
      'attribute-load',
      `${CONNECTOR_CONTEXT}/connected`,
      `${CONNECTOR_CONTEXT}/current`,
    ]) { this.sub(key, () => this.refresh()); }
    this.sub(`${CONNECTOR_CONTEXT}/result`, (result) => {
      let receipt = /** @type {import('../../../../types/connectors.js').ConnectorResult | null} */ (result);
      if (receipt && this.operation?.requestId === receipt.requestId && this.operation.action === receipt.action) { this.accept(receipt); }
    });
  }

  refresh() {
    let blocked = this.disposed || !this.isConnected || !this.connected
      || !!(this.$.disabled ?? this.hasAttribute('disabled')) || !!(this.$.readonly ?? this.hasAttribute('readonly'));
    let uncertain = this.$.outcome === 'unknown' || this.$.outcome === 'running';
    this.set$({
      unavailable: blocked || !this.requirement || !!this.$.pending || uncertain,
      receiptUnavailable: blocked || !this.operation || !!this.$.pending,
    });
    if (this.connected && !this.requirement && !this.$.error) { this.$.error = 'ACTION_UNAVAILABLE'; }
    if (!this.connected || this.autoLoaded || !this.hasAttribute('load') || blocked) { return; }
    let requirement = this.requirement;
    if (!requirement) { this.$.error = 'ACTION_UNAVAILABLE'; return; }
    this.autoLoaded = true;
    if (requirement.effect !== 'read') { this.$.error = 'AUTOLOAD_WRITE_DENIED'; return; }
    // Read-on-initialization waits until rendering/agent-command suppression ends.
    queueMicrotask(() => {
      if (this.disposed) { return; }
      if (feedbackSuppressed()) { this.autoLoaded = false; return; }
      void this.run();
    });
  }

  async run() {
    this.refresh();
    if (this.$.unavailable || feedbackSuppressed()) { return this.reject('NOT_AVAILABLE'); }
    let requirement = this.requirement;
    if (!requirement) { return this.reject('ACTION_UNAVAILABLE'); }
    let input;
    try { input = JSON.stringify(this.$.input); if (input === undefined) { throw new Error(); } }
    catch { return this.reject('INVALID_INPUT'); }
    let operation = {
      action: this.action,
      requestId: crypto.randomUUID(),
      input,
      inputRevision: this.inputRevision,
      revision: requirement.revision,
    };
    this.operation = operation;
    this.set$({
      requestId: operation.requestId,
      pending: true,
      outcome: 'running',
      error: '',
      stale: false,
    });
    this.refresh();
    try {
      let result = await callConnector(operation.action, JSON.parse(input), {
        requestId: operation.requestId,
      });
      if (!this.disposed && this.operation === operation) { this.accept(result); }
      return result;
    } finally {
      if (!this.disposed && this.operation === operation) { this.$.pending = false; this.refresh(); }
    }
  }

  async readReceipt() {
    let operation = this.operation;
    if (!operation || this.$.receiptUnavailable) { return this.reject('NOT_AVAILABLE'); }
    this.$.pending = true;
    this.refresh();
    try {
      let result = await readConnectorReceipt(operation.action, operation.requestId);
      if (!this.disposed && this.operation === operation) { this.accept(result); }
      return result;
    } finally {
      if (!this.disposed && this.operation === operation) { this.$.pending = false; this.refresh(); }
    }
  }

  /** @param {string} code */
  reject(code) {
    this.$.error = code;
    return {
      state: 'rejected',
      code,
    };
  }

  /** @param {import('../../../../types/connectors.js').ConnectorResult} receipt */
  accept(receipt) {
    let operation = this.operation;
    if (this.disposed || !this.isConnected || !operation || receipt.requestId !== operation.requestId || receipt.action !== operation.action) { return; }
    let stale = this.action !== operation.action || this.inputRevision !== operation.inputRevision
      || this.requirement?.revision !== operation.revision || receipt.revision && receipt.revision !== operation.revision;
    try { stale ||= JSON.stringify(this.$.input) !== operation.input; }
    catch { stale = true; }
    let duplicate = /** @type {import('../../../../types/connectors.js').ConnectorResult | null} */ (this.$.result);
    this.set$({
      outcome: receipt.state,
      result: {
        ...receipt,
        inputRevision: operation.inputRevision,
        stale: !!stale,
      },
      stale: !!stale,
      error: receipt.code || '',
    });
    if (receipt.state === 'completed' && !stale && (duplicate?.requestId !== receipt.requestId || duplicate.state !== 'completed')) {
      this.publishing = true;
      try {
        this.$.value = receipt.value;
        let target = this.getAttribute('pub-to')?.trim();
        if (target) { this.$[target] = receipt.value; }
      } finally { this.publishing = false; }
    }
    this.refresh();
  }

  destroyCallback() { this.disposed = true; }
}

Connector.bindAttributes({
  action: 'attribute-action',
  disabled: 'attribute-disabled',
  readonly: 'attribute-readonly',
  load: 'attribute-load',
});
