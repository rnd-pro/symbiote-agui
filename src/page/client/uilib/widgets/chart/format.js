import { isoDate } from '../../shared/data/values.js';

/**
 * @param {import('../../../../../../types/uilib-chart.js').UiChartSeries} series
 * @param {string} locale
 */
export function numberFormat(series, locale) {
  let styles = /** @type {const} */ ({
    number: 'decimal',
    currency: 'currency',
    percent: 'percent',
  });
  return new Intl.NumberFormat(locale, {
    style: styles[series.format ?? 'number'],
    ...(series.currency ? {
      currency: series.currency,
    } : {}),
    ...(series.digits === undefined ? {} : {
      minimumFractionDigits: series.digits,
      maximumFractionDigits: series.digits,
    }),
  });
}

/**
 * @param {unknown} value
 * @param {import('../../../../../../types/uilib-chart.js').UiChartState} state
 */
export function xText(value, state) {
  if (value === null || value === undefined) { return ''; }
  let readers = {
    text: () => typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value) ? String(value) : '',
    number: () => typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat(state.locale).format(value) : '',
    date: () => {
      let time = isoDate(value);
      return time === null ? '' : new Intl.DateTimeFormat(state.locale, {
        dateStyle: 'medium',
        timeZone: 'UTC',
      }).format(time);
    },
  };
  return readers[state.xType]();
}
