/** @typedef {import('../../../../../../types/data-toolbar.js').ToolbarNotice & { closeLabel: string; timeout: number }} Notification */

export class ToolbarMessages {
  /** @type {Record<string, import('../../../../../../types/data-toolbar.js').ToolbarNotice> | undefined} */
  previous;

  /** @param {import('./data-toolbar.js').DataToolbar} toolbar */
  constructor(toolbar) {
    this.toolbar = toolbar;
    toolbar.ref.panel.addEventListener('toggle', this.toggled);
  }

  /** @param {boolean} [force] */
  update(force = false) {
    let toolbar = this.toolbar;
    let current = /** @type {Record<string, import('../../../../../../types/data-toolbar.js').ToolbarNotice>} */ (toolbar.$.statusMessages);
    let previous = this.previous;
    this.previous = current;
    let panelOpen = 'showPopover' in HTMLElement.prototype && toolbar.ref.panel.matches(':popover-open');
    if (panelOpen) {
      toolbar.$.notifications = {};
      return;
    }
    let elements = /** @type {import('../../feedback/message/message.js').Message[]} */ ([
      ...toolbar.ref.messages.querySelectorAll('agui-message'),
    ]);
    for (let element of elements) {
      element.set$({
        closeLabel: toolbar.$.closeLabel,
        timeout: toolbar.$.messageTimeout,
      });
    }
    let changed = Object.entries(current).filter(([
      key,
      notice,
    ]) => previous && (notice.message !== previous[key]?.message || notice.tone !== previous[key]?.tone));
    // Repeated attempts may resurface unresolved problems, but never old successes.
    if (force && !changed.length) {
      changed = Object.entries(current).filter(([
        key,
        notice,
      ]) => key !== 'edit' && (notice.tone === 'error' || notice.tone === 'warning'));
    }
    let notifications = /** @type {Record<string, Notification>} */ (toolbar.$.notifications);
    let retained = Object.fromEntries(Object.entries(notifications).filter(([
      key,
      notice,
    ]) => current[key]?.message === notice.message && current[key]?.tone === notice.tone));
    for (let [
      key,
      notice,
    ] of changed) {
      retained[key] = {
        ...notice,
        closeLabel: String(toolbar.$.closeLabel),
        timeout: Number(toolbar.$.messageTimeout),
      };
    }
    if (JSON.stringify(retained) !== JSON.stringify(notifications)) { toolbar.$.notifications = retained; }
    else if (force) {
      for (let element of elements) {
        if (changed.some(([
          ,
          notice,
        ]) => notice.message === element.$.message && notice.tone === element.$.tone)) { element.show(); }
      }
    }
  }

  toggled = () => this.update();

  dispose() {
    this.toolbar.ref.panel.removeEventListener('toggle', this.toggled);
    for (let element of /** @type {import('../../feedback/message/message.js').Message[]} */ ([
      ...this.toolbar.ref.messages.querySelectorAll('agui-message'),
    ])) { void element.hide(true); }
  }
}
