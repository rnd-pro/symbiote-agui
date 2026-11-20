import { ThemeSelector, THEME_SELECTOR_ATTRIBUTE_BINDINGS } from '../../../uilib/controls/theme-selector/theme-selector.js';
import { declaredPreferenceTarget } from './preferences.js';
import { feedbackSuppressed } from './feedback-guard.js';
import { commitData, getDataState } from './data.js';

export class SessionThemeSelector extends ThemeSelector {
  constructor() {
    super();
    Object.assign(this.init$, {
      autoSave: undefined,
    });
  }

  renderCallback() {
    super.renderCallback();
    this.sub('autoSave', () => this.refresh());
    this.sub('attribute-auto-save', () => this.refresh());
    this.sub('AGUI_DATA/connected', () => this.refresh());
    this.sub('AGUI_DATA/current', () => this.refresh());
  }

  get saveTarget() {
    return declaredPreferenceTarget(this.getAttribute('pub-to'));
  }

  get savesAutomatically() {
    return !!(this.$.autoSave ?? this.getAttribute('auto-save') !== 'false');
  }

  get unavailable() {
    return super.unavailable || (this.savesAutomatically && !getDataState().connected);
  }

  /**
   * @param {string} value
   * @param {Event} event
   */
  async choose(value, event) {
    if (!event.isTrusted || feedbackSuppressed() || Reflect.get(event, 'agentInvoked') === true) { return; }
    this.commit(value);
    if (!this.savesAutomatically) { return; }
    let target = this.saveTarget;
    if (!target) {
      this.$.saveState = 'invalidTarget';
      return;
    }
    this.set$({
      saving: true,
      saveState: 'saving',
    });
    try {
      let result = await commitData([
        target,
      ]);
      if (!this.ready || !this.isConnected) { return; }
      this.$.saveState = result.state === 'committed' && this.$.activeValue !== value ? 'idle' : result.state;
    } catch {
      if (this.ready && this.isConnected) { this.$.saveState = 'rejected'; }
    } finally {
      this.$.saving = false;
    }
  }
}

SessionThemeSelector.bindAttributes({
  ...THEME_SELECTOR_ATTRIBUTE_BINDINGS,
  'auto-save': 'attribute-auto-save',
});
