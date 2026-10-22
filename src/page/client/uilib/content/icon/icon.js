import { UiComponent } from '../../shared/component.js';
import { ICON_NAMES } from './collection.js';
import { ICON_TEMPLATE } from './template.js';
import styles from './styles.js';

export class Icon extends UiComponent {
  init$ = { name: undefined, glyph: '' };

  renderCallback() {
    let semantics = this.attachInternals();
    semantics.role = 'img';
    let describe = () => { semantics.ariaHidden = String(!this.getAttribute('aria-label') && !this.getAttribute('aria-labelledby')); };
    this.sub('attribute-aria-label', describe);
    this.sub('attribute-aria-labelledby', describe);
    this.sub('name', this.refreshGlyph);
    this.sub('attribute-name', this.refreshGlyph);
  }

  refreshGlyph = () => {
    let name = String(this.$.name ?? this.getAttribute('name') ?? '');
    this.$.glyph = Object.hasOwn(ICON_NAMES, name) ? ICON_NAMES[/** @type {import('../../../../../../types/uilib.js').UiIconName} */ (name)] : '';
  };
}

Icon.bindAttributes({
  name: 'attribute-name',
  'aria-label': 'attribute-aria-label',
  'aria-labelledby': 'attribute-aria-labelledby',
});
Icon.template = ICON_TEMPLATE;
Icon.rootStyles = styles;
