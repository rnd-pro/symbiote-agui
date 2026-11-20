import { slotProcessor } from '@symbiotejs/symbiote/core/slotProcessor.js';
import { UiComponent } from '../../shared/component.js';
import { attributeValue } from '../../shared/attribute-value.js';
import { SIDEBAR_BLOCK_TEMPLATE } from './template.js';
import styles from './styles.js';

export class SidebarBlock extends UiComponent {
  init$ = {
    label: undefined,
    active: undefined,
    blockLabel: '',
    inactive: false,
  };

  constructor() {
    super();
    this.templateProcessors.add(slotProcessor);
  }

  renderCallback() {
    for (let key of [
      'label',
      'active',
      'attribute-label',
      'attribute-active',
    ]) { this.sub(key, () => this.refresh()); }
  }

  refresh() {
    let active = attributeValue(this.$.active ?? this.getAttribute('active') ?? true);
    if (active === '') { active = true; }
    if (typeof active !== 'boolean') { throw new TypeError('agui-sidebar-block active must be a boolean.'); }
    if (!active && this.ref.content.contains(document.activeElement)) {
      this.ref.heading.focus({
        preventScroll: true,
      });
    }
    this.set$({
      blockLabel: String(this.$.label ?? this.getAttribute('label') ?? ''),
      inactive: !active,
    });
    this.dataset.active = String(active);
  }
}

SidebarBlock.bindAttributes({
  label: 'attribute-label',
  active: 'attribute-active',
});
SidebarBlock.template = SIDEBAR_BLOCK_TEMPLATE;
SidebarBlock.rootStyles = styles;
