import { Nav } from '../nav/nav.js';
import { BREADCRUMBS_TEMPLATE } from './template.js';
import styles from './styles.js';

export class Breadcrumbs extends Nav {
  /**
   * @param {string | DocumentFragment} [template]
   * @param {boolean} [shadow]
   */
  render(template = BREADCRUMBS_TEMPLATE, shadow) {
    // An explicit template avoids reusing the rendered parent navigation cache.
    super.render(template, shadow);
  }

  get defaultValue() {
    return this.items.at(-1)?.value ?? '';
  }

  get currentKind() {
    return 'location';
  }
}

Breadcrumbs.template = BREADCRUMBS_TEMPLATE;
Breadcrumbs.rootStyles = styles;
