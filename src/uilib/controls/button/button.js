import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { slotProcessor } from '@symbiotejs/symbiote/core/slotProcessor.js';
import { transferControlAttributes } from '../../shared/control-attributes.js';
import { attributeValue } from '../../shared/attribute-value.js';
import { AttributeHost, BUTTON_ATTRIBUTES, RETAINED_ATTRIBUTES } from './attribute-host.js';
import { BUTTON_TEMPLATE } from './template.js';
import styles from './styles.js';

export class Button extends AttributeHost {
  disposed = false;
  lastChanged = false;
  /** @type {MutationObserver | undefined} */
  forwardedAttributes;
  /** @type {MutationObserver | undefined} */
  controlObserver;
  componentDescription = () => JSON.stringify({
    id: this.control?.id || '',
    label: this.control?.getAttribute('aria-label') ?? this.control?.textContent?.trim() ?? '',
  });
  init$ = {
    toggle: undefined,
    set: undefined,
    value: undefined,
    unavailable: false,
    activate: new ToolDescriptor({
      description: 'Activate this native button and its declarative state action. Returns activation/change flags without application data.',
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
    return this.disposed || !this.isConnected || !this.control || this.control.matches(':disabled')
      || this.control.hasAttribute('readonly') || this.control.getAttribute('aria-disabled') === 'true';
  }

  renderCallback() {
    this.control = /** @type {HTMLButtonElement} */ (this.ref.control);
    this.forwardedAttributes = transferControlAttributes(this, this.control, RETAINED_ATTRIBUTES);
    this.control.addEventListener('click', this.onClick);
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
    this.$.unavailable = this.unavailable;
  }

  definition() {
    let toggle = this.$.toggle ?? this.getAttribute('toggle');
    let set = this.$.set ?? this.getAttribute('set');
    if (toggle != null && set != null) { throw new TypeError('agui-button accepts either toggle or set, not both.'); }
    if (toggle == null && set == null) { return; }
    let target = String(toggle ?? set).trim();
    if (!target || !this.has(target)) { throw new TypeError('agui-button requires an existing state target.'); }
    let before = this.$[target];
    if (toggle != null && typeof before !== 'boolean') { throw new TypeError('agui-button toggle requires a boolean state value.'); }
    let value = toggle != null ? !before : attributeValue(this.$.value ?? this.getAttribute('value') ?? '');
    if (typeof value !== 'boolean' && typeof value !== 'string') { throw new TypeError('agui-button set requires a boolean or string value.'); }
    return {
      target,
      value,
      changed: !Object.is(before, value),
    };
  }

  activate() {
    if (this.unavailable) { throw new Error('This button is disabled, read-only, or disconnected.'); }
    this.definition();
    this.lastChanged = false;
    this.control?.click();
    return {
      activated: true,
      changed: this.lastChanged,
    };
  }

  /** @param {MouseEvent} event */
  onClick = (event) => {
    if (event.defaultPrevented) { return; }
    if (this.unavailable) { event.preventDefault(); return; }
    let action;
    try { action = this.definition(); }
    catch (error) { event.preventDefault(); throw error; }
    this.lastChanged = !!action?.changed;
    if (action?.changed) {
      this.$[action.target] = action.value;
      this.announce('change', action.value);
    }
  };

  destroyCallback() {
    this.disposed = true;
    this.forwardedAttributes?.disconnect();
    this.controlObserver?.disconnect();
    this.control?.removeEventListener('click', this.onClick);
  }
}

Button.bindAttributes(Object.fromEntries(BUTTON_ATTRIBUTES.map((name) => [
  name,
  `attribute-${name}`,
])));
Button.template = BUTTON_TEMPLATE;
Button.rootStyles = styles;
