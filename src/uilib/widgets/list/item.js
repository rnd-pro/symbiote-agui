import { UiComponent } from '../../shared/component.js';
import { bindItemSelection } from '../../shared/selectable-item.js';
import { LIST_ITEM_TEMPLATE } from './template.js';

export class ListItem extends UiComponent {
  applyingSelection = false;
  init$ = {
    id: '',
    record: {},
    selected: false,
    selectionEnabled: false,
    selectable: false,
    unavailable: true,
    selectionType: 'checkbox',
    groupName: '',
    selectLabel: '',
    templateSelector: '',
    fieldValue: false,
    selectionInput: undefined,
    tabIndex: -1,
  };

  renderCallback() {
    for (let key of [
      'selected',
      'selectionType',
      'id',
    ]) {
      this.sub(key, () => {
        this.applyingSelection = true;
        try {
          let value = this.$.selectionType === 'radio'
            ? this.$.selected ? String(this.$.id) : '' : !!this.$.selected;
          this.$.fieldValue = value;
          // Controls skip publishing an unchanged target; keep it aligned with incoming state.
          this.$.selectionInput = value;
        } finally { this.applyingSelection = false; }
      });
    }
    // Incoming synchronization is guarded; only explicit field edits select items.
    this.sub('selectionInput', (value) => {
      if (this.applyingSelection) { return; }
      this.select(this.$.selectionType === 'radio' ? value === this.$.id : value === true);
    }, false);
    this.clearSelectionListeners = bindItemSelection(this.ref.item, () => !!this.$.selectable, () => {
      this.select(this.$.selectionType === 'radio' || !this.$.selected);
    });
  }

  /** @param {boolean} selected */
  select(selected) {
    if (!this.isConnected || !this.$.selectable) { return; }
    let select = /** @type {import('./list.js').List['selectItem']} */ (this.$['^selectItem']);
    return select(String(this.$.id), selected);
  }

  destroyCallback() {
    this.clearSelectionListeners?.();
  }
}

ListItem.template = LIST_ITEM_TEMPLATE;
