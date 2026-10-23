/** @returns {import('../../types/uilib-chart.js').UiChartState} */
export function chartState() {
  return {
    rows: [
      {
        key: 'a',
        name: 'Alpha',
        revenue: 0,
        cost: 5,
        private: 'Not a chart field',
      },
      {
        key: 'b',
        name: 'Beta',
        revenue: 20,
        cost: 10,
      },
      {
        key: 'c',
        name: 'Gamma',
        revenue: null,
      },
    ],
    series: [
      {
        key: 'revenue',
        valueKey: 'revenue',
        label: 'Revenue',
        color: 'accent',
      },
      {
        key: 'cost',
        valueKey: 'cost',
        label: 'Cost',
      },
    ],
    value: [
      'a',
      'removed',
    ],
    idKey: 'key',
    xKey: 'name',
    xLabel: 'Company',
    xType: 'text',
    type: 'line',
    selection: 'multiple',
    locale: 'en-US',
    label: 'Sales',
    description: 'Prepared data',
    texts: {},
    loading: false,
    disabled: false,
    readonly: false,
    error: '',
  };
}
