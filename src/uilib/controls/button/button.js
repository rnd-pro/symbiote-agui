import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { slotProcessor } from '@symbiotejs/symbiote/core/slotProcessor.js';
import { transferControlAttributes } from '../../shared/control-attributes.js';
import { AttributeHost, BUTTON_ATTRIBUTES, RETAINED_ATTRIBUTES } from './attribute-host.js';
import { BUTTON_TEMPLATE } from './template.js';
import styles from './styles.js';

export class Button extends AttributeHost {
  disposed = false;
  /** @type {MutationObserver | undefined} */
  forwardedAttributes;
  /** @type {MutationObserver | undefined} */
  controlObserver;
  componentDescription = () => JSON.stringify({
    id: this.control?.id || '',
    label: this.control?.getAttribute('aria-label') ?? this.control?.textContent?.trim() ?? '',
  });
  init$ = {
    value: undefined,
    loading: undefined,
    buttonLoading: false,
    buttonBusy: 'false',
    unavailable: false,
    activate: new ToolDescriptor({
      description: 'Activate this native button, including its form or popover action, without returning application data.',
      deps: [
        'unavailable',
      ],
      when: () => !this.unavailable,
      execute: () => this.activate(),
    }),
  };

  constructor() {
    super();
    this.templateProcessors.add(slotProcessor);
  }

  get actionId() {
    return this.control?.id || super.actionId;
  }

  get unavailable() {
    return this.disposed || !this.isConnected || !!this.$.buttonLoading || !this.control || this.control.matches(':disabled')
      || this.control.hasAttribute('readonly') || this.control.getAttribute('aria-disabled') === 'true';
  }

  renderCallback() {
    this.control = /** @type {HTMLButtonElement} */ (this.ref.control);
    this.forwardedAttributes = transferControlAttributes(this, this.control, RETAINED_ATTRIBUTES);
    this.control.addEventListener('click', this.blockLoadingClick, true);
    this.controlObserver = new MutationObserver(() => {
      this.$.unavailable = this.unavailable;
      this.syncWebMCPTools();
    });
    this.controlObserver.observe(this.control, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    });
    let syncValue = () => {
      let value = this.$.value ?? this.getAttribute('value');
      if (value === null || value === undefined) { this.control?.removeAttribute('value'); }
      else { this.control?.setAttribute('value', String(value)); }
    };
    this.sub('value', syncValue);
    this.sub('attribute-value', syncValue);
    let syncLoading = () => {
      let loading = !!(this.$.loading ?? this.hasAttribute('loading'));
      this.$.buttonLoading = loading;
      this.$.buttonBusy = String(loading);
      this.$.unavailable = this.unavailable;
    };
    this.sub('loading', syncLoading);
    this.sub('attribute-loading', syncLoading);
    this.$.unavailable = this.unavailable;
  }

  activate() {
    if (this.unavailable) { throw new Error('This button is loading, disabled, read-only, or disconnected.'); }
    this.control?.click();
    return {
      activated: true,
    };
  }

  /** @param {MouseEvent} event */
  blockLoadingClick = (event) => {
    if (!this.unavailable) { return; }
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  destroyCallback() {
    super.destroyCallback();
    this.disposed = true;
    this.forwardedAttributes?.disconnect();
    this.controlObserver?.disconnect();
    this.control?.removeEventListener('click', this.blockLoadingClick, true);
  }
}

Button.bindAttributes(Object.fromEntries(BUTTON_ATTRIBUTES.map((name) => [
  name,
  `attribute-${name}`,
])));
Button.template = BUTTON_TEMPLATE;
Button.rootStyles = styles;
