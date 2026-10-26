/** @param {import('./map.js').AguiMap} map */
export function presentMap(map) {
  let state = map.stateInput();
  let model = map.model;
  let text = (/** @type {string} */ key) => String(state.texts?.[key] ?? '');
  let busy = !map.$.runtimeReady || state.loading;
  let unavailable = !model || busy || !map.$.rendererReady || state.disabled || state.readonly || !!state.error || !!map.runtimeError;
  map.set$({
    modelValid: !!model,
    viewReady: !!model && !busy && !!map.$.rendererReady && !state.error && !map.runtimeError,
    mapLabel: state.label,
    mapDescription: state.description,
    attribution: model?.state.tiles?.attribution ?? '',
    attributionUrl: model?.state.tiles?.attributionUrl ?? '',
    skippedCount: model?.skippedCount ?? 0,
    skippedLabel: text('skipped'),
    fitLabel: text('fit'),
    zoomInLabel: text('zoomIn'),
    zoomOutLabel: text('zoomOut'),
    dataLabel: text('data'),
    dataTableId: `${map.id || map.domId}-data`,
    dataSelectionMode: state.selection,
    dataDisabled: unavailable,
    unavailable,
    selectionUnavailable: unavailable || state.selection === 'none',
    fitUnavailable: unavailable || !model?.points.length,
    mapHidden: !model || busy || !!state.error || !!map.runtimeError,
    statusState: state.error || map.runtimeError || map.issue ? 'error' : busy ? 'loading' : map.tileError ? 'error' : !model?.points.length ? 'empty' : 'ready',
    statusMessage: state.error || (map.runtimeError ? text(map.runtimeError) : map.issue ? text(map.issue) : busy ? text('loading') : map.tileError ? text('tileFailed') : !model?.points.length ? text('empty') : ''),
    effectiveSelected: model?.selected ?? [],
    dataRows: model?.points.map((point) => ({
      id: point.id,
      label: point.label,
      latitude: point.latitude,
      longitude: point.longitude,
    })) ?? [],
    dataColumns: [
      {
        key: 'label',
        label: text('point'),
        type: 'text',
      },
      {
        key: 'latitude',
        label: text('latitude'),
        type: 'number',
      },
      {
        key: 'longitude',
        label: text('longitude'),
        type: 'number',
      },
    ],
  });
}
