import { UiComponent } from '../../shared/component.js';
import styles from './styles.js';

export class Toolbar extends UiComponent {
  processInnerHtml = true;

  renderCallback() {
    this.setAttribute('role', 'group');
    if (!this.hasAttribute('aria-label') && !this.hasAttribute('aria-labelledby')) {
      this.setAttribute('aria-label', this.getAttribute('label') || 'Controls');
    }
  }
}

Toolbar.rootStyles = styles;
