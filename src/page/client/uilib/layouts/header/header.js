import { UiComponent } from '../../shared/component.js';
import styles from './styles.js';

export class Header extends UiComponent {
  processInnerHtml = true;

  /** @type {ResizeObserver | undefined} */
  sizeObserver;

  /** @type {HTMLElement | undefined} */
  spacingTarget;

  renderCallback() {
    this.sizeObserver = new ResizeObserver(() => this.updateSpacing());
    this.sizeObserver.observe(this);
    this.sub('attribute-floating', () => this.updateSpacing());
  }

  updateSpacing() {
    let dashboard = this.closest('agui-dashboard') || this.nextElementSibling;
    let target = this.closest('agui-viewport')
      || (dashboard?.localName === 'agui-dashboard' ? dashboard : undefined);
    if (this.spacingTarget !== target) { this.spacingTarget?.style.removeProperty('--agui-header-height'); }
    this.spacingTarget = target instanceof HTMLElement ? target : undefined;
    this.spacingTarget?.style.setProperty('--agui-header-height', `${this.hasAttribute('floating') ? this.getBoundingClientRect().height : 0}px`);
  }

  destroyCallback() {
    this.sizeObserver?.disconnect();
    this.spacingTarget?.style.removeProperty('--agui-header-height');
  }
}

Header.bindAttributes({
  floating: 'attribute-floating',
});
Header.rootStyles = styles;
