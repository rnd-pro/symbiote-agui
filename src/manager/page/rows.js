import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from '../../page/client/uilib/shared/component.js';
import { SESSION_ROW_TEMPLATE } from './row-template.js';
import { SESSION_STATE } from './session-state.js';

export class SessionRow extends UiComponent {
  init$ = {
    ...SESSION_STATE,
    selected: false,
    selectedText: 'false',
    selectLabel: '',
    select: new ToolDescriptor({
      description: 'Select this session and show its management controls.',
      deps: [
        'sessionId',
      ],
      when: () => !!this.$.sessionId,
      execute: () => this.select(),
    }),
    selectCard: (/** @type {MouseEvent} */ event) => {
      let target = event.target;
      if (target instanceof Element && target.closest('a, button, input, select, textarea, details, [contenteditable]')) { return; }
      this.select();
    },
  };

  renderCallback() {
    this.sub('selected', (selected) => { this.$.selectedText = String(!!selected); });
  }

  select() {
    let id = String(this.$.sessionId);
    let changed = !!id && !this.$.selected;
    if (changed) {
      this.$.selected = true;
      let target = this.getAttribute('pub-to')?.trim();
      if (target) { this.$[target] = [
        id,
      ]; }
    }
    return {
      selected: !!this.$.selected,
      changed,
    };
  }
}

SessionRow.template = SESSION_ROW_TEMPLATE;
SessionRow.reg('agui-session-row');
