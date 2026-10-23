import { Table } from '../table/table.js';

export class ChartDataTable extends Table {
  /**
   * @param {import('../../../../../../types/uilib-table.js').UiTableProperty} property
   * @param {unknown} value
   */
  edit(property, value) {
    if (property !== 'value') { return super.edit(property, value); }
    let select = /** @type {import('./chart.js').Chart['setSelection']} */ (this.$['^selectIds']);
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
