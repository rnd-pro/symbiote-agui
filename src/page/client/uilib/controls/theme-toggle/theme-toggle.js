import { Toggle } from '../toggle/toggle.js';
import { watchAttribute } from '../../shared/control-attributes.js';

export class ThemeToggle extends Toggle {
  /** @type {MediaQueryList | undefined} */
  schemeQuery;

  constructor() {
    super();
    Object.assign(this.init$, { '*theme': 'system', lightLabel: undefined, darkLabel: undefined });
  }

  get isDark() {
    return this.$['*theme'] === 'dark' || (this.$['*theme'] === 'system' && !!this.schemeQuery?.matches);
  }

  renderCallback() {
    this.schemeQuery = matchMedia('(prefers-color-scheme: dark)');
    super.renderCallback();
    for (let [key, attribute] of [['lightLabel', 'light-label'], ['darkLabel', 'dark-label'], ['label', 'label']]) {
      this.sub(key, this.refreshLabel);
      watchAttribute(this, attribute, this.refreshLabel);
    }
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
    this.$.fieldLabel = String(actionLabel ?? this.$.label ?? this.getAttribute('label') ?? '');
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

