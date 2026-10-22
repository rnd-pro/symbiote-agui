import {
  MESSAGE_KEYS,
  MESSAGE_TIMEOUT_MS,
} from './constants.js';

export class ToolbarMessages {
  /** @type {string[] | undefined} */
  previous;
  /** @type {number | undefined} */
  timer;
  generation = 0;

  /** @param {import('./data-toolbar.js').DataToolbar} toolbar */
  constructor(toolbar) {
    this.toolbar = toolbar;
    this.popover = typeof toolbar.ref.messages.showPopover === 'function';
    if (!this.popover) {
      toolbar.ref.messages.removeAttribute('popover');
    }
  }

  /** @param {boolean} [force] */
  update(force = false) {
    let messages = MESSAGE_KEYS.map((key) => String(this.toolbar.$[key] ?? ''));
    let changed = this.previous && messages.some((message, index) => message !== this.previous?.[index]);
    this.previous = messages;
    if (!messages.some(Boolean)) {
      void this.hide();
      return;
    }
    if (!force && !changed) {
      return;
    }
    window.clearTimeout(this.timer);
    this.generation += 1;
    this.toolbar.ref.messages.removeAttribute('data-closing');
    this.toolbar.$.messagesVisible = true;
    if (this.popover && !this.toolbar.ref.messages.matches(':popover-open')) {
      this.toolbar.ref.messages.showPopover();
    }
    this.toolbar.updateSize();
    let timeout = Number(this.toolbar.$.messageTimeout);
    this.timer = window.setTimeout(() => { void this.hide(); }, Number.isFinite(timeout) && timeout > 0 ? timeout : MESSAGE_TIMEOUT_MS);
  }

  /** @param {boolean} [immediate] */
  async hide(immediate = false) {
    window.clearTimeout(this.timer);
    this.timer = undefined;
    let generation = ++this.generation;
    let element = this.toolbar.ref.messages;
    if (!immediate && !element.hidden) {
      element.setAttribute('data-closing', '');
      await Promise.allSettled(element.getAnimations().map((/** @type {Animation} */ animation) => animation.finished));
    }
    if (generation !== this.generation) { return; }
    if (this.popover && this.toolbar.ref.messages.matches(':popover-open')) {
      this.toolbar.ref.messages.hidePopover();
    }
    this.toolbar.$.messagesVisible = false;
    element.removeAttribute('data-closing');
    this.toolbar.updateSize();
  }

  dispose() {
    void this.hide(true);
  }
}
