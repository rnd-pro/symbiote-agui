/** @param {import('./chart.js').Chart} chart */
export function presentChart(chart) {
  let state = chart.stateInput();
  let model = chart.model;
  let text = (/** @type {string} */ key) => String(state.texts?.[key] ?? '');
  let failure = chart.runtimeError ? text(chart.runtimeError) : '';
  let busy = !chart.$.runtimeReady || state.loading;
  let unavailable = !model || busy || state.disabled || state.readonly || !!state.error || !!chart.runtimeError;
  chart.set$({
    modelValid: !!model,
    chartLabel: state.label,
    chartDescription: state.description,
    dataLabel: text('data'),
    dataTableId: `${chart.id || chart.domId}-data`,
    dataSelectionMode: state.selection,
    dataLoading: state.loading,
    dataError: state.error,
    dataDisabled: unavailable,
    unavailable: unavailable || state.selection === 'none',
    plotHidden: !model?.hasData || busy || !!state.error || !!chart.runtimeError,
    statusState: state.error || chart.runtimeError || chart.issue ? 'error' : busy ? 'loading' : !model?.hasData ? 'empty' : 'ready',
    statusMessage: state.error || failure || (chart.issue ? text(chart.issue) : busy ? text('loading') : !model?.hasData ? text('empty') : ''),
    effectiveSelected: model?.selected ?? [],
    dataRows: model?.points.map((point) => ({
      id: point.id,
      x: point.x,
      ...Object.fromEntries(point.formatted.map((value, index) => [
        `s${index}`,
        value,
      ])),
    })) ?? [],
    dataColumns: model ? [
      {
        key: 'x',
        label: state.xLabel,
        type: 'text',
      },
      ...state.series.map((series, index) => ({
        key: `s${index}`,
        label: series.label,
        type: 'text',
      })),
    ] : [],
  });
}
