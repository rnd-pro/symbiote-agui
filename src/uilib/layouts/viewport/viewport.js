import { UiComponent } from '../../shared/component.js';
import styles from './styles.js';

export class Viewport extends UiComponent {
  processInnerHtml = true;

  renderCallback() {
    if (!this.hasAttribute('role')) { this.setAttribute('role', 'main'); }
    if (!this.hasAttribute('tabindex')) { this.tabIndex = 0; }
  }
}

Viewport.rootStyles = styles;
