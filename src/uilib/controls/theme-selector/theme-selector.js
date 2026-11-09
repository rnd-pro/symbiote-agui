import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from '../../shared/component.js';
import { feedbackSuppressed } from '../../shared/feedback-guard.js';
import { commitData, getDataState } from '../../../page/client/data.js';
import { THEME_PALETTES } from './palettes.js';
import { THEME_SELECTOR_TEMPLATE } from './template.js';
import styles from './styles.js';

let nextSelectorId = 0;
let ATTRIBUTES = Object.freeze([
  'value',
  'label',
  'aria-label',
  'disabled',
  'readonly',
  'pub-to',
]);

export class ThemeSelector extends UiComponent {
  ready = false;
  componentDescription = () => JSON.stringify({
    id: this.id,
    label: this.$.selectorLabel,
  });
  init$ = {
    value: undefined,
    label: undefined,
    texts: undefined,
    disabled: undefined,
    readonly: undefined,
    popupId: `agui-theme-palettes-${++nextSelectorId}`,
    selectorLabel: '',
    activeValue: 'graphite',
    entries: [],
    unavailable: true,
    saving: false,
    saveState: 'idle',
    statusMessage: '',
    statusClass: '',
    set_value: new ToolDescriptor({
      description: 'Apply a palette and publish its value as a draft, without saving data. Trusted user palette clicks save only the declared palette property.',
      inputSchema: {
        type: 'object',
        properties: {
          value: {
            type: 'string',
            enum: THEME_PALETTES,
          },
        },
        required: [
          'value',
        ],
        additionalProperties: false,
      },
      execute: ({
        value,
      }) => this.commit(value),
    }),
    read_value: new ToolDescriptor({
      description: 'Read the selected palette and local saving state without returning application data.',
      execute: () => ({
        value: this.$.activeValue,
        saveState: this.$.saveState,
      }),
    }),
  };

  renderCallback() {
    this.ready = true;
    for (let key of ATTRIBUTES) {
      if (!key.includes('-')) { this.sub(key, () => this.refresh()); }
      this.sub(`attribute-${key}`, () => this.refresh());
    }
    for (let key of [
      'texts',
      'saving',
      'saveState',
      'AGUI_DATA/connected',
      'AGUI_DATA/current',
    ]) { this.sub(key, () => this.refresh()); }
  }

  /** @param {string} key */
  text(key) {
    let texts = /** @type {import('../../../../types/uilib.js').UiTexts | undefined} */ (this.$.texts);
    return String(texts?.[key] ?? '');
  }

  get saveTarget() {
    let path = this.getAttribute('pub-to')?.trim().split('/');
    if (path?.length !== 2) { return; }
    let [
      provider,
      key,
    ] = path;
    let declaration = getDataState().current?.targets.find((target) => target.provider === provider);
    if (declaration?.keys.includes(key)) {
      return {
        provider,
        keys: [
          key,
        ],
      };
    }
  }

  refresh() {
    if (!this.ready || !this.isConnected) { return; }
    let value = this.$.value ?? this.getAttribute('value') ?? 'graphite';
    if (typeof value !== 'string' || !THEME_PALETTES.includes(value)) {
      throw new TypeError(this.text('invalidValue'));
    }
    this.ownerDocument.body.dataset.palette = value;
    let saveState = String(this.$.saveState);
    if (value !== this.$.activeValue && !this.$.saving && saveState !== 'unknown') { saveState = 'idle'; }
    let unavailable = !!(this.$.disabled ?? this.hasAttribute('disabled'))
      || !!(this.$.readonly ?? this.hasAttribute('readonly')) || !!this.$.saving
      || this.$.saveState === 'unknown' || !getDataState().connected;
    this.set$({
      activeValue: value,
      saveState,
      unavailable,
      selectorLabel: String(this.getAttribute('aria-label') ?? this.$.label ?? this.getAttribute('label') ?? ''),
      statusMessage: this.text(saveState),
      statusClass: [
        'mt-3 text-sm',
        [
          'rejected',
          'unknown',
          'invalidTarget',
        ].includes(saveState) ? 'text-agui-danger' : 'text-agui-muted',
      ].join(' '),
      entries: THEME_PALETTES.map((palette) => ({
        value: palette,
        label: this.text(palette),
        selected: palette === value,
        pressed: String(palette === value),
        disabled: unavailable,
        select: (/** @type {Event} */ event) => this.choose(palette, event),
      })),
    });
  }

  /** @param {unknown} value */
  commit(value) {
    if (this.$.unavailable) { throw new Error(this.text('unavailable')); }
    if (typeof value !== 'string' || !THEME_PALETTES.includes(value)) {
      throw new TypeError(this.text('invalidValue'));
    }
    let changed = value !== this.$.activeValue;
    if (changed) {
      this.$.value = value;
      let target = this.getAttribute('pub-to')?.trim();
      if (target && !Object.is(this.$[target], value)) { this.$[target] = value; }
      this.announce('change', value);
    }
    return {
      value,
      changed,
    };
  }

  /**
   * @param {string} value
   * @param {Event} event
   */
  async choose(value, event) {
    if (!event.isTrusted || feedbackSuppressed() || Reflect.get(event, 'agentInvoked') === true) { return; }
    this.commit(value);
    let target = this.saveTarget;
    if (!target) {
      this.$.saveState = 'invalidTarget';
      return;
    }
    this.set$({
      saving: true,
      saveState: 'saving',
    });
    try {
      let result = await commitData([
        target,
      ]);
      if (!this.ready || !this.isConnected) { return; }
      this.$.saveState = result.state === 'committed' && this.$.activeValue !== value ? 'idle' : result.state;
    } catch {
      if (this.ready && this.isConnected) { this.$.saveState = 'rejected'; }
    } finally {
      this.$.saving = false;
    }
  }

  destroyCallback() {
    this.ready = false;
    if (!this.ownerDocument.querySelector('agui-theme-selector')) {
      delete this.ownerDocument.body.dataset.palette;
    }
  }
}

ThemeSelector.bindAttributes(Object.fromEntries(ATTRIBUTES.map((key) => [
  key,
  `attribute-${key}`,
])));
ThemeSelector.template = THEME_SELECTOR_TEMPLATE;
ThemeSelector.rootStyles = styles;
