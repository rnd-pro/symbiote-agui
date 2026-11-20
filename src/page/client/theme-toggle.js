import { ThemeToggle } from '../../uilib/controls/theme-toggle/theme-toggle.js';
import { declaredPreferenceTarget } from './preferences.js';
import { feedbackSuppressed } from './feedback-guard.js';
import { commitData } from './data.js';

export class SessionThemeToggle extends ThemeToggle {
  renderCallback() {
    super.renderCallback();
    // Apply the native choice before saving, including keyboard activation.
    this.control?.addEventListener('click', this.saveTheme);
  }

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

  destroyCallback() {
    super.destroyCallback();
    this.control?.removeEventListener('click', this.saveTheme);
  }
}
