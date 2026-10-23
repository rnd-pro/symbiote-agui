import { DATA_LIMITS } from '../../shared/data/constants.js';
import { nonempty, record, validateRows, validateIds, validateLocale } from '../../shared/data/validate.js';
import { CHART_LIMITS, CHART_COLORS } from './constants.js';
import { numberFormat, xText } from './format.js';

/**
 * @param {import('../../../../../../types/uilib-chart.js').UiChartState} state
 * @returns {import('../../../../../../types/uilib-chart.js').UiChartModel}
 */
export function deriveChart(state) {
  validateRows(state.rows, state.idKey);
  if (state.rows.length > CHART_LIMITS.rows) { throw new Error('invalidRows'); }
  validateIds(state.value);
  validateLocale(state.locale);
  if (![
    'line',
    'bar',
    'donut',
  ].includes(state.type) || ![
    'none',
    'single',
    'multiple',
  ].includes(state.selection) || ![
    'text',
    'number',
    'date',
  ].includes(state.xType) || !nonempty(state.xKey, DATA_LIMITS.key) || !nonempty(state.xLabel, DATA_LIMITS.text)) { throw new Error('invalidState'); }
  if (!Array.isArray(state.series) || !state.series.length || state.series.length > CHART_LIMITS.series
    || state.type === 'donut' && state.series.length !== 1
    || new Set(state.series.map((series) => series?.key)).size !== state.series.length) { throw new Error('invalidSeries'); }
  for (let series of state.series) {
    if (!record(series) || !nonempty(series.key, DATA_LIMITS.key) || !nonempty(series.valueKey, DATA_LIMITS.key)
      || !nonempty(series.label, DATA_LIMITS.text) || series.color !== undefined && !CHART_COLORS.includes(series.color)
      || series.format !== undefined && ![
        'number',
        'currency',
        'percent',
      ].includes(series.format) || series.format === 'currency' && !/^[A-Z]{3}$/.test(series.currency ?? '')
      || series.digits !== undefined && (!Number.isInteger(series.digits) || series.digits < 0 || series.digits > 6)
      || series.unit !== undefined && (typeof series.unit !== 'string' || series.unit.length > DATA_LIMITS.text)) { throw new Error('invalidSeries'); }
  }
  if (state.type !== 'donut' && state.series.some((series) => (series.format ?? 'number') !== (state.series[0].format ?? 'number')
    || series.currency !== state.series[0].currency || series.unit !== state.series[0].unit)) { throw new Error('invalidSeries'); }
  let formats;
  try { formats = state.series.map((series) => numberFormat(series, state.locale)); } catch { throw new Error('invalidSeries'); }
  let points = state.rows.map((row) => {
    let values = state.series.map((series) => {
      let value = row[series.valueKey];
      if (value === null || value === undefined) { return null; }
      if (typeof value !== 'number' || !Number.isFinite(value) || state.type === 'donut' && value < 0) { throw new Error('invalidRows'); }
      return value;
    });
    return {
      id: String(row[state.idKey]),
      x: xText(row[state.xKey], state),
      values,
      formatted: values.map((value, index) => value === null ? '' : `${formats[index].format(value)}${state.series[index].unit ? ` ${state.series[index].unit}` : ''}`),
    };
  });
  let ids = new Set(points.map((point) => point.id));
  let selected = state.selection === 'none' ? [] : state.value.filter((id) => ids.has(id));
  if (state.selection === 'single') { selected = selected.slice(0, 1); }
  return {
    state,
    points,
    selected,
    hasData: points.some((point) => point.values.some((value) => value !== null && (state.type !== 'donut' || value > 0))),
  };
}

/**
 * @param {import('../../../../../../types/uilib-chart.js').UiChartModel} model
 * @param {string[]} ids
 */
export function selectedIds(model, ids) {
  validateIds(ids);
  let available = new Set(model.points.map((point) => point.id));
  if (model.state.selection === 'none' || model.state.selection === 'single' && ids.length > 1
    || ids.some((id) => !available.has(id))) { throw new Error('invalidState'); }
  return ids.slice();
}
