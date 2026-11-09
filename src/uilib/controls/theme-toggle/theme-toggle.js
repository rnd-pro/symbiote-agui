import { Control } from '../../shared/control.js';
import { CONTROL_ATTRIBUTE_BINDINGS } from '../../shared/constants.js';
import { THEME_TOGGLE_TEMPLATE } from './template.js';
import { declaredPreferenceTarget } from '../../shared/data/preferences.js';
import { feedbackSuppressed } from '../../shared/feedback-guard.js';
import { commitData } from '../../../page/client/data.js';

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
      texts: undefined,
      saving: false,
      saveBusy: 'false',
      saveState: 'idle',
      saveMessage: '',
      saveTone: 'error',
      saveCloseLabel: '',
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
    this.sub('saving', () => {
      this.$.saveBusy = String(this.$.saving);
      this.setAvailability();
    });
    this.sub('texts', this.refreshSaveMessage);
    this.sub('saveState', this.refreshSaveMessage);
    // The inherited listener applies the choice first; persistence follows only
    // trusted clicks, including native keyboard activation.
    this.control?.addEventListener('click', this.saveTheme);
  }

  setAvailability() {
    super.setAvailability();
    if (this.control && (this.$.saving || this.$.saveState === 'unknown')) {
      this.control.disabled = true;
    }
  }

  refreshSaveMessage = () => {
    let texts = /** @type {import('../../../../types/uilib.js').UiTexts | undefined} */ (this.$.texts);
    let state = String(this.$.saveState);
    this.set$({
      saveMessage: state === 'rejected' || state === 'unknown' ? String(texts?.[state] ?? '') : '',
      saveTone: state === 'unknown' ? 'warning' : 'error',
      saveCloseLabel: String(texts?.closeMessage ?? ''),
    });
    this.setAvailability();
  };

  /** @param {Event} event */
  saveTheme = async (event) => {
    if (!event.isTrusted || feedbackSuppressed() || Reflect.get(event, 'agentInvoked') === true) { return; }
    let provider = this.getAttribute('ctx')?.trim();
    let target = provider ? declaredPreferenceTarget(`${provider}/theme`) : undefined;
    if (!target) { return; }
    this.set$({
      saving: true,
      saveState: 'saving',
    });
    try {
      let result = await commitData([
        target,
      ]);
      if (this.isConnected) { this.$.saveState = result.state; }
    } catch {
      if (this.isConnected) { this.$.saveState = 'rejected'; }
    } finally {
      this.$.saving = false;
    }
  };

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
    this.control?.removeEventListener('click', this.saveTheme);
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
