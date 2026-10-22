import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from '../../shared/component.js';
import { STATE_LABELS } from './constants.js';
import { STATE_TEMPLATE } from './template.js';
import styles from './styles.js';
import { watchAttribute } from '../../shared/control-attributes.js';

export class State extends UiComponent {
  init$ = {
    status: undefined, message: undefined, retryLabel: undefined,
    stateHidden: true, stateRole: 'status', stateBusy: 'false', stateMessage: '', stateRetryLabel: '', retryVisible: false,
    retry: new ToolDescriptor({
      description: 'Request retry for this error state. This does not claim the request has succeeded.',
      deps: ['retryVisible'],
      when: () => this.$.retryVisible === true,
      execute: () => ({ requested: this.announce('retry') }),
    }),
  };

  renderCallback() {
    for (let [key, attribute] of [['status', 'status'], ['message', 'message'], ['retryLabel', 'retry-label']]) {
      this.sub(key, () => this.refresh());
      watchAttribute(this, attribute, () => this.refresh());
    }
  }

  refresh() {
    let status = String(this.$.status ?? this.getAttribute('status') ?? 'ready');
    if (!Object.hasOwn(STATE_LABELS, status)) { throw new Error('agui-state status must be ready, loading, empty, or error.'); }
    let retryLabel = String(this.$.retryLabel ?? this.getAttribute('retry-label') ?? '');
    this.set$({
      stateHidden: status === 'ready',
      stateRole: status === 'error' ? 'alert' : 'status',
      stateBusy: String(status === 'loading'),
      stateMessage: String(this.$.message ?? this.getAttribute('message') ?? STATE_LABELS[/** @type {import('../../../../../../types/uilib.js').UiStatus} */ (status)]),
      stateRetryLabel: retryLabel,
      retryVisible: status === 'error' && !!retryLabel,
    });
  }
}

State.template = STATE_TEMPLATE;
State.rootStyles = styles;
