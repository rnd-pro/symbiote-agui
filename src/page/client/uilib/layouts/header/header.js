import { UiComponent } from '../../shared/component.js';
import styles from './styles.js';

export class Header extends UiComponent {
  processInnerHtml = true;

  /** @type {ResizeObserver | undefined} */
  sizeObserver;

  renderCallback() {
    this.sizeObserver = new ResizeObserver(() => {
      let dashboard = this.closest('agui-dashboard') || this.nextElementSibling;
      if (dashboard instanceof HTMLElement && dashboard.localName === 'agui-dashboard') {
        dashboard.style.setProperty('--agui-header-height', `${this.hasAttribute('floating') ? this.getBoundingClientRect().height : 0}px`);
      }
    });
    this.sizeObserver.observe(this);
  }

  destroyCallback() { this.sizeObserver?.disconnect(); }
}

Header.rootStyles = styles;
