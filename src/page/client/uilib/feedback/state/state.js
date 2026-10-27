import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from '../../shared/component.js';
import { STATE_STATUSES } from './constants.js';
import { STATE_TEMPLATE } from './template.js';
import styles from './styles.js';

export class State extends UiComponent {
  init$ = {
    status: undefined, message: undefined, retryLabel: undefined,
    stateHidden: true, stateRole: 'status', stateBusy: 'false', stateMessage: '', stateRetryLabel: '', retryVisible: false,
    stateLoading: false,
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
      this.sub(`attribute-${attribute}`, () => this.refresh());
    }
  }

  refresh() {
    let status = String(this.$.status ?? this.getAttribute('status') ?? 'ready');
    if (!STATE_STATUSES.includes(status)) { throw new Error('agui-state status must be ready, loading, empty, or error.'); }
    let retryLabel = String(this.$.retryLabel ?? this.getAttribute('retry-label') ?? '');
    this.set$({
      stateHidden: status === 'ready',
      stateRole: status === 'error' ? 'alert' : 'status',
      stateBusy: String(status === 'loading'),
      stateLoading: status === 'loading',
      stateMessage: String(this.$.message ?? this.getAttribute('message') ?? ''),
      stateRetryLabel: retryLabel,
      retryVisible: status === 'error' && !!retryLabel,
    });
  }
}

State.bindAttributes({
  status: 'attribute-status',
  message: 'attribute-message',
  'retry-label': 'attribute-retry-label',
});
State.template = STATE_TEMPLATE;
State.rootStyles = styles;
