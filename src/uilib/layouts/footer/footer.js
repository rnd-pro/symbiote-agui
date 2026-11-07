import { UiComponent } from '../../shared/component.js';
import styles from './styles.js';

export class Footer extends UiComponent {
  processInnerHtml = true;

  renderCallback() {
    if (!this.hasAttribute('role')) { this.setAttribute('role', 'contentinfo'); }
  }
}

Footer.rootStyles = styles;
