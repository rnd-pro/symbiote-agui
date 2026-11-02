import { slotProcessor } from '@symbiotejs/symbiote/core/slotProcessor.js';
import { UiComponent } from '../../shared/component.js';
import { CONDITIONAL_TEMPLATE } from './template.js';
import styles from './styles.js';

let attributes = Object.freeze([
  'when',
  'is',
  'behavior',
]);

export class Conditional extends UiComponent {
  source = '';
  /** @type {Set<string>} */
  sources = new Set();
  mounted = false;
  disposed = false;
  init$ = {
    when: undefined,
    is: undefined,
    behavior: undefined,
    contentItems: null,
  };

  constructor() {
    super();
    // Project authored content before native Itemize reads its item template.
    this.templateProcessors.add(slotProcessor);
  }

  renderCallback() {
    for (let key of attributes) {
      this.sub(key, () => this.refresh());
      this.sub(`attribute-${key}`, () => this.refresh());
    }
  }

  refresh() {
    if (this.disposed) { return; }
    this.source = String(this.$.when ?? this.getAttribute('when') ?? '').trim();
    if (this.source && !this.sources.has(this.source)) {
      let source = this.source;
      this.sources.add(source);
      // Native sub owns deferred contexts and cleanup. Reused keys subscribe once.
      this.sub(source, () => {
        if (source === this.source) { this.updateContent(); }
      });
    }
    this.updateContent();
  }

  updateContent() {
    if (this.disposed) { return; }
    let behavior = this.$.behavior ?? this.getAttribute('behavior') ?? 'show';
    if (behavior !== 'show' && behavior !== 'dom-add') {
      throw new TypeError('agui-conditional behavior must be "show" or "dom-add".');
    }
    let expected = this.$.is ?? this.getAttribute('is');
    if (expected === 'true') { expected = true; }
    else if (expected === 'false') { expected = false; }
    let value = this.source && this.has(this.source) ? this.$[this.source] : undefined;
    let matches = !!this.source && (expected === null || expected === undefined ? !!value : value === expected);
    this.hidden = !matches;
    let mount = behavior === 'show' || matches;
    if (mount !== this.mounted) {
      this.mounted = mount;
      // null clears Itemize immediately; show mode keeps the existing item mounted.
      this.$.contentItems = mount ? [
        {},
      ] : null;
    }
  }

  destroyCallback() {
    this.disposed = true;
  }
}

Conditional.bindAttributes(Object.fromEntries(attributes.map((key) => [
  key,
  `attribute-${key}`,
])));
Conditional.template = CONDITIONAL_TEMPLATE;
Conditional.rootStyles = styles;
