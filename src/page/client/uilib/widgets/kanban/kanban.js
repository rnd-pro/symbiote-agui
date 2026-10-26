import { itemizeProcessor } from '@symbiotejs/symbiote/core/itemizeProcessor-keyed.js';
import { UiComponent } from '../../shared/component.js';
import { emit } from '../../../events.js';
import { KANBAN_ATTRIBUTES } from './constants.js';
import { deriveKanban, moveRecord } from './model.js';
import { presentKanban } from './presentation.js';
import { kanbanTools } from './tools.js';
import { KANBAN_TEMPLATE } from './template.js';
import styles from './styles.js';
import { KanbanInteraction } from './interaction.js';

export class Kanban extends UiComponent {
  componentDescription = () => JSON.stringify({
    id: this.id,
    label: this.$.boardLabel,
  });
  /** @type {import('../../../../../../types/uilib-kanban.js').UiKanbanModel | undefined} */
  model;
  /** @type {import('../../../../../../types/uilib-kanban.js').UiKanbanIssue | undefined} */
  issue;
  disposed = false;
  /** @type {KanbanInteraction | undefined} */
  interaction;
  init$ = {
    value: [],
    columns: [],
    texts: {},
    ...Object.fromEntries(Object.keys(KANBAN_ATTRIBUTES).map((key) => [
      key,
      undefined,
    ])),
    unavailable: true,
    modelValid: false,
    boardLabel: '',
    moveHint: '',
    busyText: 'false',
    surfaceHidden: true,
    statusMessage: '',
    statusState: 'ready',
    columnItems: [],
    moveItem: (
      /** @type {string} */ id,
      /** @type {string} */ status,
    ) => this.moveItem(id, status),
    ...kanbanTools(this),
  };

  constructor() {
    super();
    this.templateProcessors.add(/** @type {typeof import('@symbiotejs/symbiote/core/slotProcessor.js').slotProcessor} */ (itemizeProcessor));
  }

  renderCallback() {
    this.interaction = new KanbanInteraction(this);
    for (let key of [
      'value',
      'columns',
      'texts',
      ...Object.keys(KANBAN_ATTRIBUTES),
      ...Object.values(KANBAN_ATTRIBUTES).map((attribute) => `attribute-${attribute}`),
    ]) { this.sub(key, () => this.refresh()); }
  }

  /** @returns {import('../../../../../../types/uilib-kanban.js').UiKanbanState} */
  stateInput() {
    /**
     * @param {keyof typeof KANBAN_ATTRIBUTES} key
     * @param {unknown} fallback
     */
    let get = (key, fallback) => this.$[key] ?? this.getAttribute(KANBAN_ATTRIBUTES[key]) ?? fallback;
    return /** @type {import('../../../../../../types/uilib-kanban.js').UiKanbanState} */ ({
      value: this.$.value,
      columns: this.$.columns,
      texts: this.$.texts,
      idKey: get('idKey', 'id'),
      statusKey: get('statusKey', 'status'),
      titleKey: get('titleKey', 'title'),
      descriptionKey: get('descriptionKey', ''),
      label: String(get('label', '')),
      error: String(get('error', '')),
      loading: !!(this.$.loading ?? this.hasAttribute('loading')),
      disabled: !!(this.$.disabled ?? this.hasAttribute('disabled')),
      readonly: !!(this.$.readonly ?? this.hasAttribute('readonly')),
    });
  }

  refresh() {
    if (this.disposed || !this.isConnected) { return; }
    this.interaction?.cancel();
    let state = this.stateInput();
    this.issue = undefined;
    try { this.model = deriveKanban(state); }
    catch (error) {
      this.model = undefined;
      let code = error instanceof Error ? error.message : '';
      this.issue = code === 'invalidRows' || code === 'invalidColumns' ? code : 'invalidState';
    }
    presentKanban(this, state);
    this.syncWebMCPTools();
  }

  /** @param {string} key */
  text(key) {
    return String((/** @type {import('../../../../../../types/uilib.js').UiTexts} */ (this.$.texts))?.[key] ?? '');
  }

  requireModel() {
    if (!this.model) { throw new Error(this.text(this.issue ?? 'invalidState')); }
    return this.model;
  }

  /**
   * @param {string} id
   * @param {string} status
   */
  moveItem(id, status) {
    let model = this.requireModel();
    if (this.$.unavailable || this.disposed || !this.isConnected) { throw new Error(this.text('unavailable')); }
    let moved;
    try { moved = moveRecord(model, id, status); } catch { throw new Error(this.text('invalidState')); }
    if (moved.changed) {
      this.$.value = moved.value;
      let target = this.getAttribute('pub-to')?.trim();
      if (target) { this.$[target] = moved.value; }
      /** @type {import('../../../../../../types/uilib-kanban.js').UiKanbanAction} */
      let action = {
        widgetId: this.id || this.localName,
        context: this.getAttribute('ctx')?.trim() || null,
        action: 'kanban-change',
        recordId: id,
        status,
        totalCount: moved.value.length,
      };
      emit('agui:action', action);
    }
    return {
      changed: moved.changed,
      recordId: id,
      status,
      totalCount: moved.value.length,
    };
  }

  /** @param {string} id */
  focusItem(id) {
    queueMicrotask(() => {
      if (this.disposed || !this.isConnected) { return; }
      for (let card of this.querySelectorAll('agui-kanban-card')) {
        let item = /** @type {import('./card.js').KanbanCard} */ (card);
        if (item.$.recordId === id) {
          /** @type {HTMLElement | undefined} */ (item.ref.card)?.focus();
          break;
        }
      }
    });
  }

  destroyCallback() {
    this.disposed = true;
    this.interaction?.destroy();
  }
}

Kanban.bindAttributes(Object.fromEntries(Object.values(KANBAN_ATTRIBUTES).map((attribute) => [
  attribute,
  `attribute-${attribute}`,
])));
Kanban.template = KANBAN_TEMPLATE;
Kanban.rootStyles = styles;
