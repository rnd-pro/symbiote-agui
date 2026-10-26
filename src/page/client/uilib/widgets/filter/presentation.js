/**
 * @param {import('./filter.js').Filter} filter
 * @param {import('../../../../../../types/uilib-filter.js').UiFilterState} state
 */
export function presentFilter(filter, state) {
  let text = (/** @type {string} */ key) => String(state.texts?.[key] ?? '');
  let unavailable = !filter.model || state.disabled || state.readonly || state.loading || !!state.error;
  filter.set$({
    unavailable,
    modelValid: !!filter.model,
    queryLabel: text('search'),
    queryText: state.query,
    resultIds: state.loading || state.error ? [] : filter.model?.ids ?? [],
    statusState: state.loading ? 'loading' : state.error || filter.issue ? 'error' : !filter.model?.ids.length ? 'empty' : 'ready',
    statusMessage: state.loading ? text('loading') : state.error || (filter.issue ? text(filter.issue) : !filter.model?.ids.length ? text('empty') : ''),
    fieldItems: (filter.model ? state.fields : []).filter((field) => field.filter).map((field) => ({
      id: field.key,
      fieldKey: field.key,
      label: field.label,
      minLabel: text('minimum'),
      maxLabel: text('maximum'),
      allLabel: text('all'),
      isContains: field.filter === 'contains',
      isEquals: field.filter === 'equals',
      isRange: field.filter === 'range',
      rangeType: field.type === 'date' ? 'date' : 'number',
      filterValue: state.value[field.key] ?? '',
      options: field.type === 'boolean' ? [
        {
          value: 'true',
          label: text('trueLabel'),
        },
        {
          value: 'false',
          label: text('falseLabel'),
        },
      ] : field.options ?? [],
      unavailable,
    })),
  });
}
