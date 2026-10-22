import { UiComponent } from '../../shared/component.js';
import { watchAttribute } from '../../shared/control-attributes.js';
import { ICON_NAMES } from './collection.js';
import { ICON_TEMPLATE } from './template.js';
import styles from './styles.js';

export class Icon extends UiComponent {
  init$ = { name: undefined, glyph: '' };

  renderCallback() {
    let semantics = this.attachInternals();
    semantics.role = 'img';
    let describe = () => { semantics.ariaHidden = String(!this.getAttribute('aria-label') && !this.getAttribute('aria-labelledby')); };
    watchAttribute(this, 'aria-label', describe);
    watchAttribute(this, 'aria-labelledby', describe);
    this.sub('name', this.refreshGlyph);
    watchAttribute(this, 'name', this.refreshGlyph);
  }

  refreshGlyph = () => {
    let name = String(this.$.name ?? this.getAttribute('name') ?? '');
    this.$.glyph = Object.hasOwn(ICON_NAMES, name) ? ICON_NAMES[/** @type {import('../../../../../../types/uilib.js').UiIconName} */ (name)] : '';
  };
}

Icon.template = ICON_TEMPLATE;
Icon.rootStyles = styles;
