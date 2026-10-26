import {
  MESSAGE_KEYS,
} from './constants.js';

export class ToolbarMessages {
  /** @type {string[] | undefined} */
  previous;

  /** @param {import('./data-toolbar.js').DataToolbar} toolbar */
  constructor(toolbar) {
    this.toolbar = toolbar;
    this.element = /** @type {import('../../feedback/message/message.js').Message} */ (toolbar.ref.messages);
    toolbar.ref.panel.addEventListener('toggle', this.toggled);
  }

  /** @param {boolean} [force] */
  update(force = false) {
    let messages = MESSAGE_KEYS.map((key) => String(this.toolbar.$[key] ?? ''));
    let changed = this.previous && messages.some((message, index) => message !== this.previous?.[index]);
    this.previous = messages;
    this.element.set$({
      closeLabel: this.toolbar.$.closeLabel,
      timeout: this.toolbar.$.messageTimeout,
    });
    let panelOpen = 'showPopover' in HTMLElement.prototype && this.toolbar.ref.panel.matches(':popover-open');
    if (panelOpen || !messages.some(Boolean)) {
      void this.element.hide();
      return;
    }
    if (!force && !changed) { return; }
    this.element.set$({
      tone: this.toolbar.$.errorMessage ? 'alert' : 'info',
      message: messages.filter(Boolean).join('\n'),
    });
    this.element.show();
  }

  toggled = () => this.update();

  dispose() {
    this.toolbar.ref.panel.removeEventListener('toggle', this.toggled);
    void this.element.hide(true);
  }
}
