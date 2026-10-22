import { Toggle } from '../toggle/toggle.js';

export class ThemeToggle extends Toggle {
  /** @type {MediaQueryList | undefined} */
  schemeQuery;

  constructor() {
    super();
    Object.assign(this.init$, { '*theme': 'system' });
  }

  get isDark() {
    return this.$['*theme'] === 'dark' || (this.$['*theme'] === 'system' && !!this.schemeQuery?.matches);
  }

  renderCallback() {
    this.schemeQuery = matchMedia('(prefers-color-scheme: dark)');
    if (!this.hasAttribute('aria-label') && !this.hasAttribute('aria-labelledby')) {
      this.setAttribute('aria-label', 'Dark theme');
    }
    super.renderCallback();
    this.schemeQuery.addEventListener('change', this.refreshChecked);
    this.sub('*theme', this.refreshChecked);
  }

  refreshChecked = () => {
    this.ownerDocument.body.dataset.theme = String(this.$['*theme']);
    let dark = this.isDark;
    this.set$({ value: dark, label: dark ? 'Switch to light theme' : 'Switch to dark theme' });
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

