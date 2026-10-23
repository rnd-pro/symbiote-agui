import { UiComponent } from '../../shared/component.js';

let nextPanelId = 0;

let TAB_ATTRIBUTES = Object.freeze([
  'value',
  'label',
  'disabled',
]);

export class Tab extends UiComponent {
  processInnerHtml = true;
  ready = false;
  buttonId = '';
  init$ = {
    value: undefined,
    label: undefined,
    disabled: undefined,
  };

  renderCallback() {
    this.id ||= `agui-tab-panel-${++nextPanelId}`;
    this.buttonId = `agui-tab-trigger-${++nextPanelId}`;
    this.setAttribute('role', 'tabpanel');
    this.setAttribute('aria-labelledby', this.buttonId);
    if (!this.hasAttribute('tabindex')) { this.tabIndex = 0; }
    this.ready = true;
    for (let key of TAB_ATTRIBUTES) {
      this.sub(key, () => this.refreshOwner());
      this.sub(`attribute-${key}`, () => this.refreshOwner());
    }
  }

  get definition() {
    let value = this.$.value ?? this.getAttribute('value') ?? '';
    if (typeof value !== 'string') { throw new Error('Tab values must be strings.'); }
    return {
      value,
      label: String(this.$.label ?? this.getAttribute('label') ?? ''),
      disabled: !!(this.$.disabled ?? this.hasAttribute('disabled')),
    };
  }

  refreshOwner() {
    let owner = /** @type {import('./tabs.js').Tabs | null} */ (this.parentElement?.closest('agui-tabs'));
    owner?.refresh();
  }

  destroyCallback() {
    this.ready = false;
  }
}

Tab.bindAttributes(Object.fromEntries(TAB_ATTRIBUTES.map((key) => [
  key,
  `attribute-${key}`,
])));
