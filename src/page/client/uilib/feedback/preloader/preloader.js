import { UiComponent } from '../../shared/component.js';
import { PRELOADER_TEMPLATE } from './template.js';
import styles from './styles.js';

export class Preloader extends UiComponent {
  init$ = {
    label: undefined,
    progressLabel: '',
    progressLabelledBy: '',
  };

  renderCallback() {
    for (let key of [
      'label',
      'attribute-label',
      'attribute-aria-label',
      'attribute-aria-labelledby',
    ]) { this.sub(key, this.describe); }
  }

  describe = () => {
    this.set$({
      progressLabel: this.getAttribute('aria-label') || String(this.$.label ?? this.getAttribute('label') ?? ''),
      progressLabelledBy: this.getAttribute('aria-labelledby') || '',
    });
  };
}

Preloader.bindAttributes({
  label: 'attribute-label',
  'aria-label': 'attribute-aria-label',
  'aria-labelledby': 'attribute-aria-labelledby',
});
Preloader.template = PRELOADER_TEMPLATE;
Preloader.rootStyles = styles;
