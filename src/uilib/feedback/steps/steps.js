import { UiComponent } from '../../shared/component.js';
import { STEPS_TEMPLATE } from './template.js';
import styles from './styles.js';

let ATTRIBUTES = Object.freeze([
  'value',
  'complete',
  'label',
  'aria-label',
  'aria-labelledby',
]);

export class Steps extends UiComponent {
  init$ = {
    items: [],
    value: undefined,
    complete: undefined,
    label: undefined,
    texts: {},
    entries: [],
    progressLabel: '',
    progressLabelledBy: '',
    statusState: 'ready',
    statusMessage: '',
    '+renderInput': () => [
      this.$.items,
      this.$.texts,
      this.$.value,
      this.$.complete,
      this.$.label,
      ...ATTRIBUTES.map((attribute) => this.$[`attribute-${attribute}`]),
    ],
  };

  renderCallback() {
    // Bindings publish sequentially; render their settled combination so an
    // intermediate invalid value cannot queue removal of otherwise valid steps.
    this.sub('+renderInput', () => this.refresh());
  }

  /** @param {string} key */
  text(key) {
    return String((/** @type {import('../../../../types/uilib.js').UiTexts} */ (this.$.texts))?.[key] ?? '');
  }

  refresh() {
    let items = this.$.items;
    let value = this.$.value ?? this.getAttribute('value') ?? '';
    let complete = this.$.complete ?? this.hasAttribute('complete');
    let issue = '';
    if (!Array.isArray(items) || items.some((item) => !item || typeof item.value !== 'string' || !item.value.trim()
      || typeof item.label !== 'string') || new Set(items.map((item) => item.value)).size !== items.length) {
      issue = 'invalidItems';
    } else if (typeof value !== 'string' || typeof complete !== 'boolean'
      || (!complete && value !== '' && !items.some((item) => item.value === value))) {
      issue = 'invalidValue';
    }
    let steps = /** @type {Pick<import('../../../../types/uilib.js').UiOption, 'value' | 'label'>[]} */ (issue ? [] : items);
    let current = steps.findIndex((item) => item.value === value);
    this.set$({
      progressLabel: String(this.getAttribute('aria-label') ?? this.$.label ?? this.getAttribute('label') ?? ''),
      progressLabelledBy: this.getAttribute('aria-labelledby') || false,
      statusState: issue ? 'error' : 'ready',
      statusMessage: this.text(issue),
      entries: steps.map((item, index) => {
        let state = complete || index < current ? 'completed' : index === current ? 'current' : 'pending';
        return {
          label: item.label,
          number: String(index + 1),
          state,
          completed: state === 'completed',
          current: state === 'current' ? 'step' : false,
          statusLabel: this.text(state),
        };
      }),
    });
  }
}

Steps.bindAttributes(Object.fromEntries(ATTRIBUTES.map((attribute) => [
  attribute,
  `attribute-${attribute}`,
])));
Steps.template = STEPS_TEMPLATE;
Steps.rootStyles = styles;
