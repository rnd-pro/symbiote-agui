import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { slotProcessor } from '@symbiotejs/symbiote/core/slotProcessor.js';
import { itemizeProcessor } from '@symbiotejs/symbiote/core/itemizeProcessor-keyed.js';
import { UiComponent } from '../../shared/component.js';
import { MAX_ACTION_VALUE_CHARS } from '../../shared/constants.js';
import { Tab } from './tab.js';
import { TABS_TEMPLATE } from './template.js';
import styles from './styles.js';

let HORIZONTAL_KEYS = Object.freeze({
  ArrowLeft: -1,
  ArrowRight: 1,
});
let VERTICAL_KEYS = Object.freeze({
  ArrowUp: -1,
  ArrowDown: 1,
});
let TABS_ATTRIBUTES = Object.freeze([
  'value',
  'label',
  'orientation',
  'disabled',
  'readonly',
]);

export class Tabs extends UiComponent {
  componentDescription = () => JSON.stringify({
    id: this.id,
    label: String(this.$.label ?? this.getAttribute('label') ?? ''),
  });
  ready = false;
  focusValue = '';
  /** @type {MutationObserver | undefined} */
  panelObserver;
  init$ = {
    value: undefined,
    label: undefined,
    orientation: undefined,
    disabled: undefined,
    readonly: undefined,
    activeValue: '',
    buttons: [],
    listLabel: '',
    listOrientation: 'horizontal',
    selectTab: (/** @type {unknown} */ value) => this.commit(value),
    set_value: new ToolDescriptor({
      description: 'Select an enabled tab by value. Returns only its effective value and change flag.',
      inputSchema: {
        type: 'object',
        properties: {
          value: {
            type: 'string',
            minLength: 1,
            maxLength: MAX_ACTION_VALUE_CHARS,
          },
        },
        required: [
          'value',
        ],
        additionalProperties: false,
      },
      execute: ({
        value,
      }) => this.commit(value),
    }),
    read_value: new ToolDescriptor({
      description: 'Read the effective active tab value, including any local fallback.',
      execute: () => ({
        value: this.$.activeValue,
      }),
    }),
  };

  constructor() {
    super();
    this.templateProcessors.add(slotProcessor);
    // Runs before the default processor and consumes its itemize attributes.
    this.templateProcessors.add(/** @type {typeof slotProcessor} */ (itemizeProcessor));
  }

  renderCallback() {
    this.ready = true;
    this.ref.list.addEventListener('keydown', this.onKeydown);
    this.ref.list.addEventListener('focusout', this.onFocusout);
    this.panelObserver = new MutationObserver(() => this.refresh());
    this.panelObserver.observe(this.ref.panels, {
      childList: true,
    });
    for (let key of TABS_ATTRIBUTES) {
      this.sub(key, () => this.refresh());
      this.sub(`attribute-${key}`, () => this.refresh());
    }
  }

  get panels() {
    return /** @type {Tab[]} */ ([...this.ref.panels.children].filter((element) => element instanceof Tab && element.ready));
  }

  get unavailable() {
    return !!(this.$.disabled ?? this.hasAttribute('disabled')) || !!(this.$.readonly ?? this.hasAttribute('readonly'));
  }

  refresh() {
    if (!this.ready || !this.isConnected) { return; }
    let panels = this.panels;
    let values = panels.map((panel) => panel.definition.value);
    if (values.some((value) => typeof value !== 'string' || !value.trim() || value.length > MAX_ACTION_VALUE_CHARS)
      || new Set(values).size !== values.length) {
      throw new Error('Tabs require unique nonempty string values within the action size limit.');
    }
    let enabled = panels.filter((panel) => !panel.definition.disabled);
    let requested = this.$.value ?? this.getAttribute('value') ?? '';
    let active = enabled.find((panel) => panel.definition.value === requested) || enabled[0];
    let value = active?.definition.value ?? '';
    let orientation = this.$.orientation ?? this.getAttribute('orientation') ?? 'horizontal';
    if (orientation !== 'horizontal' && orientation !== 'vertical') { throw new Error('Tabs orientation must be horizontal or vertical.'); }
    let moveFocus = panels.some((panel) => panel !== active && panel.contains(document.activeElement));
    if (this.$.activeValue !== value || !enabled.some((panel) => panel.definition.value === this.focusValue)) {
      this.focusValue = value;
    }
    this.set$({
      activeValue: value,
      listLabel: String(this.$.label ?? this.getAttribute('label') ?? ''),
      listOrientation: orientation,
      buttons: panels.map((panel) => ({
        id: panel.buttonId,
        value: panel.definition.value,
        label: panel.definition.label,
        disabled: this.unavailable || panel.definition.disabled,
        selected: String(panel === active),
        tabIndex: !this.unavailable && panel.definition.value === this.focusValue ? 0 : -1,
        panelId: panel.id,
      })),
    });
    this.dataset.orientation = orientation;
    if (moveFocus) {
      let button = this.buttons.find((item) => item.value === value && !item.disabled);
      (button || this.ref.list).focus();
    }
    this.ref.list.tabIndex = this.unavailable || !enabled.length ? 0 : -1;
    for (let panel of panels) {
      panel.hidden = panel !== active;
    }
    this.syncWebMCPTools();
  }

  get buttons() {
    return /** @type {HTMLButtonElement[]} */ ([...this.ref.list.querySelectorAll('button[role="tab"]')]);
  }

  /**
   * @param {unknown} value
   */
  commit(value) {
    if (this.unavailable) { throw new Error('These tabs are disabled or read-only.'); }
    let panel = this.panels.find((item) => item.definition.value === value && !item.definition.disabled);
    if (!panel || typeof value !== 'string') { throw new Error('Choose an enabled tab value.'); }
    let changed = this.$.activeValue !== value;
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

  /**
   * @param {KeyboardEvent} event
   */
  onKeydown = (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || this.unavailable) { return; }
    let buttons = this.buttons.filter((button) => !button.disabled);
    let index = buttons.indexOf(/** @type {HTMLButtonElement} */ (event.target));
    if (index < 0) { return; }
    let vertical = this.$.listOrientation === 'vertical';
    let keys = vertical ? VERTICAL_KEYS : HORIZONTAL_KEYS;
    let delta = /** @type {Record<string, number>} */ (keys)[event.key];
    if (!vertical && getComputedStyle(this.ref.list).direction === 'rtl') { delta *= -1; }
    let next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
      : delta ? (index + delta + buttons.length) % buttons.length : undefined;
    if (next === undefined) { return; }
    event.preventDefault();
    this.focusValue = buttons[next].value;
    this.refresh();
    buttons[next].focus();
  };

  /**
   * @param {FocusEvent} event
   */
  onFocusout = (event) => {
    if (event.relatedTarget instanceof Node && this.ref.list.contains(event.relatedTarget)) { return; }
    this.focusValue = String(this.$.activeValue);
    this.refresh();
  };

  destroyCallback() {
    this.ready = false;
    this.panelObserver?.disconnect();
    this.ref.list.removeEventListener('keydown', this.onKeydown);
    this.ref.list.removeEventListener('focusout', this.onFocusout);
  }
}

Tabs.bindAttributes(Object.fromEntries(TABS_ATTRIBUTES.map((key) => [
  key,
  `attribute-${key}`,
])));
Tabs.template = TABS_TEMPLATE;
Tabs.rootStyles = styles;
