export let CHART_RUNTIME_PATH = '/client/uilib/widgets/chart/runtime/index.js';
export let CHART_LIMITS = Object.freeze({
  rows: 500,
  series: 8,
});
export let CHART_ATTRIBUTES = Object.freeze({
  type: 'type',
  selection: 'selection',
  idKey: 'id-key',
  xKey: 'x-key',
  xLabel: 'x-label',
  xType: 'x-type',
  locale: 'locale',
  label: 'label',
  description: 'description',
  disabled: 'disabled',
  readonly: 'readonly',
  loading: 'loading',
  error: 'error',
});
/** @type {readonly import('../../../../../../types/uilib-chart.js').UiChartColor[]} */
export let CHART_COLORS = Object.freeze([
  'accent',
  'success',
  'warning',
  'danger',
  'muted',
]);
