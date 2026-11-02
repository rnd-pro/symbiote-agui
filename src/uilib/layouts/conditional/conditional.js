import { slotProcessor } from '@symbiotejs/symbiote/core/slotProcessor.js';
import { UiComponent } from '../../shared/component.js';
import { attributeValue } from '../../shared/attribute-value.js';
import { CONDITIONAL_TEMPLATE } from './template.js';
import styles from './styles.js';

let attributes = Object.freeze([
  'when',
  'is',
  'behavior',
]);

let behaviors = Object.freeze({
  show: {
    dom: false,
    inverse: false,
  },
  hide: {
    dom: false,
    inverse: true,
  },
  'dom-add': {
    dom: true,
    inverse: false,
  },
  'dom-remove': {
    dom: true,
    inverse: true,
  },
});

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
    let behavior = String(this.$.behavior ?? this.getAttribute('behavior') ?? 'show');
    let mode = Object.hasOwn(behaviors, behavior) ? behaviors[/** @type {keyof typeof behaviors} */ (behavior)] : undefined;
    if (!mode) {
      throw new TypeError('agui-conditional behavior must be "show", "hide", "dom-add", or "dom-remove".');
    }
    let expected = attributeValue(this.$.is ?? this.getAttribute('is'));
    let value = this.source && this.has(this.source) ? this.$[this.source] : undefined;
    let matches = !!this.source && (expected === null || expected === undefined ? !!value : value === expected);
    let visible = mode.inverse ? !matches : matches;
    this.hidden = !visible;
    let mount = !mode.dom || visible;
    if (mount !== this.mounted) {
      this.mounted = mount;
      // null clears Itemize immediately; visibility behaviors keep the item mounted.
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
