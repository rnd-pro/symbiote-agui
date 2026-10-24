import { Control } from '../../shared/control.js';
import { CONTROL_ATTRIBUTE_BINDINGS } from '../../shared/constants.js';
import { THEME_TOGGLE_TEMPLATE } from './template.js';

export class ThemeToggle extends Control {
  /** @type {MediaQueryList | undefined} */
  schemeQuery;

  constructor() {
    super();
    Object.assign(this.init$, {
      '*theme': 'system',
      lightLabel: undefined,
      darkLabel: undefined,
      showLabel: undefined,
      showText: false,
      buttonClass: 'agui-button-icon',
      buttonLabel: '',
      themeIcon: '',
    });
  }

  get isDark() {
    return this.$['*theme'] === 'dark' || (this.$['*theme'] === 'system' && !!this.schemeQuery?.matches);
  }

  renderCallback() {
    this.schemeQuery = matchMedia('(prefers-color-scheme: dark)');
    super.renderCallback();
    for (let [
      attribute,
      key,
    ] of Object.entries({
      'light-label': 'lightLabel',
      'dark-label': 'darkLabel',
      'show-label': 'showLabel',
      label: 'label',
    })) {
      this.sub(key, this.refreshLabel);
      this.sub(`attribute-${attribute}`, this.refreshLabel);
    }
    this.sub('attribute-aria-label', this.refreshLabel);
    this.schemeQuery.addEventListener('change', this.refreshChecked);
    this.sub('*theme', this.refreshChecked);
  }

  refreshChecked = () => {
    this.ownerDocument.body.dataset.theme = String(this.$['*theme']);
    let dark = this.isDark;
    this.$.value = dark;
    this.refreshLabel();
  };

  refreshLabel = () => {
    let actionLabel = this.isDark ? this.$.lightLabel ?? this.getAttribute('light-label') : this.$.darkLabel ?? this.getAttribute('dark-label');
    let label = String(actionLabel ?? this.$.label ?? this.getAttribute('label') ?? '');
    let showText = !!(this.$.showLabel ?? this.hasAttribute('show-label')) && !!label;
    this.set$({
      fieldLabel: label,
      buttonLabel: this.getAttribute('aria-label') ?? label,
      showText,
      buttonClass: showText ? '' : 'agui-button-icon',
      themeIcon: this.isDark ? 'light_mode' : 'dark_mode',
    });
  };

  /** @param {unknown} value */
  commit(value) {
    let result = super.commit(value);
    this.$['*theme'] = value ? 'dark' : 'light';
    return result;
  }

  destroyCallback() {
    super.destroyCallback();
    this.schemeQuery?.removeEventListener('change', this.refreshChecked);
  }
}

ThemeToggle.bindAttributes({
  ...CONTROL_ATTRIBUTE_BINDINGS,
  'light-label': 'attribute-light-label',
  'dark-label': 'attribute-dark-label',
  'show-label': 'attribute-show-label',
});
ThemeToggle.template = THEME_TOGGLE_TEMPLATE;
