import { Table } from '../widgets/table/table.js';

// Native pop-up context forwards table edits to its owning widget's guard.
export class SelectionTable extends Table {
  /**
   * @param {import('../../../../../types/uilib-table.js').UiTableProperty} property
   * @param {unknown} value
   */
  edit(property, value) {
    if (property !== 'value') { return super.edit(property, value); }
    let select = /** @type {(ids: string[]) => { changed: boolean; selectedCount: number }} */ (this.$['^selectIds']);
    let result = select(/** @type {string[]} */ (value));
    let model = this.requireModel();
    return {
      changed: result.changed,
      selectedCount: result.selectedCount,
      filteredCount: model.filtered.length,
      page: model.page,
    };
  }
}
