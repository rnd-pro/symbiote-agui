import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { slotProcessor } from '@symbiotejs/symbiote/core/slotProcessor.js';
import { UiComponent } from '../../shared/component.js';
import { DIALOG_TEMPLATE } from './template.js';
import styles from './styles.js';

let nextDialogId = 0;
let DIALOG_ATTRIBUTES = Object.freeze({
  value: 'open',
  label: 'label',
  openLabel: 'open-label',
  closeLabel: 'close-label',
});

export class Dialog extends UiComponent {
  componentDescription = () => JSON.stringify({
    id: this.id,
    label: String(this.$.dialogLabel),
  });
  disposed = false;
  init$ = {
    value: undefined,
    label: undefined,
    openLabel: undefined,
    closeLabel: undefined,
    opened: false,
    openedText: 'false',
    surfaceId: '',
    dialogLabel: '',
    triggerLabel: '',
    dismissLabel: '',
    open: new ToolDescriptor({
      description: 'Open this modal dialog without saving or discarding draft values.',
      execute: () => this.commit(true),
    }),
    close: new ToolDescriptor({
      description: 'Close this dialog without saving or discarding draft values.',
      execute: () => this.commit(false),
    }),
    read_value: new ToolDescriptor({
      description: 'Read whether this dialog is open.',
      execute: () => ({
        value: this.$.opened,
      }),
    }),
  };

  constructor() {
    super();
    this.templateProcessors.add(slotProcessor);
  }

  renderCallback() {
    this.$.surfaceId = `agui-dialog-surface-${++nextDialogId}`;
    this.ref.dialog.addEventListener('close', this.onClose);
    for (let [
      key,
      attribute,
    ] of Object.entries(DIALOG_ATTRIBUTES)) {
      this.sub(key, () => this.refresh());
      this.sub(`attribute-${attribute}`, () => this.refresh());
    }
  }

  refresh() {
    if (this.disposed || !this.isConnected) { return; }
    let value = this.$.value ?? this.hasAttribute('open');
    if (typeof value !== 'boolean') { throw new TypeError('Dialog value must be a boolean.'); }
    let dialog = /** @type {HTMLDialogElement} */ (this.ref.dialog);
    this.set$({
      dialogLabel: String(this.$.label ?? this.getAttribute('label') ?? ''),
      triggerLabel: String(this.$.openLabel ?? this.getAttribute('open-label') ?? ''),
      dismissLabel: String(this.$.closeLabel ?? this.getAttribute('close-label') ?? ''),
    });
    if (value && !dialog.open) { dialog.showModal(); }
    else if (!value && dialog.open) { dialog.close(); }
    this.set$({
      opened: dialog.open,
      openedText: String(dialog.open),
    });
    this.syncWebMCPTools();
  }

  /**
   * @param {boolean} value
   */
  commit(value) {
    let changed = !Object.is(this.$.opened, value);
    if (changed) {
      this.$.value = value;
      let target = this.getAttribute('pub-to')?.trim();
      if (target && !Object.is(this.$[target], value)) { this.$[target] = value; }
      this.announce('change', value);
    }
    return {
      value,
      changed,
    };
  }

  onClose = () => {
    // Native close events are queued; an earlier close must not undo a reopen.
    if (this.isConnected && !/** @type {HTMLDialogElement} */ (this.ref.dialog).open) { this.commit(false); }
  };

  destroyCallback() {
    this.disposed = true;
    let dialog = /** @type {HTMLDialogElement} */ (this.ref.dialog);
    dialog.removeEventListener('close', this.onClose);
    if (dialog.open) { dialog.close(); }
  }
}

Dialog.bindAttributes(Object.fromEntries(Object.values(DIALOG_ATTRIBUTES).map((attribute) => [
  attribute,
  `attribute-${attribute}`,
])));
Dialog.template = DIALOG_TEMPLATE;
Dialog.rootStyles = styles;
