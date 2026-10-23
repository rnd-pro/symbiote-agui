import { cellText } from '../../shared/data/values.js';

/**
 * @param {import('./table.js').Table} table
 * @param {import('../../../../../../types/uilib-table.js').UiTableState} state
 */
export function presentTable(table, state) {
  let model = table.model;
  let unavailable = !model || state.disabled || state.readonly || state.loading || !!state.error;
  let selected = new Set(model?.selected);
  let matchingIds = model?.filtered.map((row) => String(row[state.idKey])) ?? [];
  let all = matchingIds.length > 0 && matchingIds.every((id) => selected.has(id));
  let selectable = state.selection !== 'none';
  let text = (/** @type {string} */ key) => String(state.texts?.[key] ?? '');
  let headingId = (/** @type {string} */ key) => `${table.domId}-${key}`;
  let columns = model ? state.columns : [];
  let base = {
    unavailable,
    groupName: table.domId,
    selectionType: state.selection === 'single' ? 'radio' : 'checkbox',
  };
  let selectionHeading = {
    id: '$selection',
    headingId: headingId('$selection'),
    columnKey: '',
    label: text('selection'),
    sortable: false,
    ariaSort: false,
    sortIcon: 'sort',
    selectAll: state.selection === 'multiple',
    selectAllLabel: text('selectAll'),
    selected: all,
    mixed: !all && matchingIds.some((id) => selected.has(id)),
    unavailable: unavailable || !matchingIds.length,
  };
  table.set$({
    unavailable,
    selectionEnabled: selectable && !!model,
    modelValid: !!model,
    tableLabel: state.label,
    busyText: String(state.loading),
    surfaceHidden: !model || state.loading || !!state.error,
    statusMessage: state.loading ? text('loading') : state.error || (table.issue ? text(table.issue) : !model?.filtered.length ? text('empty') : ''),
    resultsLabel: text('results'),
    selectedLabel: text('selected'),
    pageLabel: text('page'),
    paginationLabel: text('pagination'),
    previousLabel: text('previous'),
    nextLabel: text('next'),
    totalCount: state.rows?.length ?? 0,
    filteredCount: model?.filtered.length ?? 0,
    selectedCount: selected.size,
    effectivePage: model?.page ?? 1,
    pageCount: model?.pageCount ?? 1,
    previousDisabled: unavailable || !model || model.page <= 1,
    nextDisabled: unavailable || !model || model.page >= model.pageCount,
    headings: [
      ...(selectable ? [
        selectionHeading,
      ] : []),
      ...columns.map((column) => ({
        ...selectionHeading,
        id: column.key,
        headingId: headingId(column.key),
        columnKey: column.key,
        label: column.label,
        selectAll: false,
        sortable: !!column.sortable,
        ariaSort: state.sort?.key === column.key ? state.sort.direction : false,
        sortIcon: state.sort?.key === column.key ? state.sort.direction === 'ascending' ? 'expand_less' : 'expand_more' : 'sort',
        unavailable,
      })),
    ],
    bodyRows: (state.loading || state.error ? [] : model?.visible ?? []).map((row) => {
      let rowId = String(row[state.idKey]);
      let cell = {
        ...base,
        id: '$selection',
        rowId,
        headingId: headingId('$selection'),
        columnKey: '',
        text: '',
        cellClass: '',
        tone: false,
        isSelection: true,
        selected: selected.has(rowId),
        selectLabel: `${text('selectRow')} ${rowId}`.trim(),
      };
      return {
        id: rowId,
        rowId,
        cells: [
          ...(selectable ? [
            cell,
          ] : []),
          ...columns.map((column) => ({
            ...cell,
            id: column.key,
            headingId: headingId(column.key),
            columnKey: column.key,
            text: cellText(row, column, state),
            cellClass: column.type === 'status' ? 'agui-chip' : '',
            tone: column.options?.find((option) => option.value === row[column.key])?.tone ?? false,
            isSelection: false,
          })),
        ],
      };
    }),
  });
}
