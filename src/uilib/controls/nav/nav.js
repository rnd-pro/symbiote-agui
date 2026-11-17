import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from '../../shared/component.js';
import { MAX_ACTION_VALUE_CHARS } from '../../shared/constants.js';
import { NAV_TEMPLATE } from './template.js';
import styles from './styles.js';

let NAV_ATTRIBUTES = Object.freeze([
  'value',
  'label',
  'disabled',
  'readonly',
  'aria-label',
  'aria-labelledby',
]);

export class Nav extends UiComponent {
  ready = false;
  componentDescription = () => JSON.stringify({
    id: this.id,
    label: this.$.navigationLabel,
  });
  init$ = {
    items: [],
    routes: undefined,
    value: undefined,
    label: undefined,
    disabled: undefined,
    readonly: undefined,
    activeValue: '',
    section: '',
    sectionName: '',
    sectionIcon: '',
    sectionSrc: '',
    entries: [],
    navigationLabel: '',
    navigationLabelledBy: false,
    set_value: new ToolDescriptor({
      description: 'Select an enabled navigation section and publish its value. Returns the value and change flag.',
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
      description: 'Read the current navigation section without returning application data.',
      execute: () => ({
        value: this.$.activeValue,
      }),
    }),
  };

  renderCallback() {
    this.ready = true;
    this.sub('items', () => this.refresh());
    this.sub('routes', () => this.refresh());
    for (let key of NAV_ATTRIBUTES) {
      if (!key.startsWith('aria-')) { this.sub(key, () => this.refresh()); }
      this.sub(`attribute-${key}`, () => this.refresh());
    }
  }

  get unavailable() {
    return !this.ready || !this.isConnected
      || !!(this.$.disabled ?? this.hasAttribute('disabled'))
      || !!(this.$.readonly ?? this.hasAttribute('readonly'));
  }

  get defaultValue() {
    return '';
  }

  get currentKind() {
    return 'page';
  }

  get items() {
    let items = this.$.items;
    let routes = this.$.routes;
    if (routes != null) {
      if (typeof routes !== 'object' || Array.isArray(routes)) { throw new TypeError('Navigation routes must be a route map.'); }
      items = Object.entries(/** @type {Record<string, import('../../../../types/uilib.js').UiNavRoute>} */ (routes))
        .filter((entry) => !entry[1].error).map(([
          value,
          route,
        ]) => ({
          value,
          label: route.title ?? '',
          icon: route.icon,
          disabled: route.disabled,
          src: route.src,
        }));
    }
    if (!Array.isArray(items) || items.some((item) => !item
      || typeof item.value !== 'string' || !item.value.trim() || item.value.length > MAX_ACTION_VALUE_CHARS
      || typeof item.label !== 'string' || (item.icon !== undefined && typeof item.icon !== 'string')
      || (item.src !== undefined && typeof item.src !== 'string')
      || (item.disabled !== undefined && typeof item.disabled !== 'boolean'))
      || new Set(items.map((item) => item.value)).size !== items.length) {
      throw new TypeError('Navigation items require unique nonempty string values, string labels, and optional icon and disabled fields.');
    }
    return /** @type {import('../../../../types/uilib.js').UiNavItem[]} */ (items);
  }

  refresh() {
    if (!this.ready || !this.isConnected) { return; }
    let items = this.items;
    let requested = this.$.value ?? this.getAttribute('value') ?? this.defaultValue;
    if (typeof requested !== 'string') { throw new TypeError('Navigation value must be a string.'); }
    let active = items.find((item) => !item.disabled && item.value === requested);
    this.set$({
      activeValue: active?.value ?? '',
      section: active?.value ?? '',
      sectionName: active?.label ?? '',
      sectionIcon: active?.icon ?? '',
      sectionSrc: active?.src ?? '',
      navigationLabel: String(this.$.label ?? this.getAttribute('label') ?? this.getAttribute('aria-label') ?? ''),
      navigationLabelledBy: this.getAttribute('aria-labelledby') || false,
      entries: items.map((item) => ({
        value: item.value,
        label: item.label,
        icon: item.icon ?? '',
        current: item === active ? this.currentKind : false,
        disabled: this.unavailable || !!item.disabled,
        select: () => this.commit(item.value),
      })),
    });
  }

  /** @param {unknown} value */
  commit(value) {
    if (this.unavailable) { throw new Error('This navigation is disabled or read-only.'); }
    if (typeof value !== 'string' || !this.items.some((item) => item.value === value && !item.disabled)) {
      throw new Error('Choose an enabled navigation section.');
    }
    let changed = this.$.activeValue !== value;
    if (changed) {
      this.$.value = value;
      let target = this.getAttribute('pub-to')?.trim();
      if (target && !Object.is(this.$[target], value)) { this.$[target] = value; }
      this.announce('change', value);
      this.setAttribute('value', value);
      this.dispatchEvent(new Event('change', {
        bubbles: true,
      }));
    }
    return {
      value,
      changed,
    };
  }

  destroyCallback() {
    super.destroyCallback();
    this.ready = false;
  }
}

Nav.bindAttributes(Object.fromEntries(NAV_ATTRIBUTES.map((key) => [
  key,
  `attribute-${key}`,
])));
Nav.template = NAV_TEMPLATE;
Nav.rootStyles = styles;
