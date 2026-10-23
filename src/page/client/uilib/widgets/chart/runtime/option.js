import { CHART_COLORS } from '../constants.js';
import { numberFormat } from '../format.js';

/**
 * @param {import('../../../../../../../types/uilib-chart.js').UiChartModel} model
 * @param {import('../../../../../../../types/uilib-chart.js').UiChartTheme} theme
 * @returns {import('echarts/core').EChartsCoreOption}
 */
export function chartOption(model, theme) {
  let state = model.state;
  let selected = new Set(model.selected);
  let series = state.series.map((series, index) => {
    let color = theme.colors[series.color ?? CHART_COLORS[index % CHART_COLORS.length]];
    return {
      id: series.key,
      name: series.label,
      type: state.type === 'donut' ? 'pie' : state.type,
      ...(state.type === 'donut' ? {
        radius: [
          '45%',
          '72%',
        ],
        stillShowZeroSum: false,
        label: {
          color: theme.text,
          fontFamily: theme.font,
        },
      } : {}),
      selectedMode: false,
      connectNulls: false,
      itemStyle: {
        color,
      },
      data: model.points.filter((point) => state.type !== 'donut' || point.values[index] !== null).map((point) => {
        let hash = Array.from(point.id).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);
        return {
          id: point.id,
          name: point.x,
          value: point.values[index],
          selected: selected.has(point.id),
          symbolSize: selected.has(point.id) ? 10 : 6,
          itemStyle: {
            color: state.type === 'donut' ? theme.colors[CHART_COLORS[hash % CHART_COLORS.length]] : color,
            opacity: selected.size && !selected.has(point.id) ? .4 : 1,
            borderColor: selected.has(point.id) ? theme.text : 'transparent',
            borderWidth: selected.has(point.id) ? 2 : 0,
          },
        };
      }),
    };
  });
  let format = numberFormat(state.series[0], state.locale);
  return {
    animation: !theme.reducedMotion,
    animationDuration: 200,
    animationDurationUpdate: 150,
    textStyle: {
      color: theme.text,
      fontFamily: theme.font,
    },
    legend: {
      show: state.type !== 'donut',
      type: 'scroll',
      top: 0,
      bottom: 'auto',
      left: 8,
      right: 8,
      selectedMode: false,
      pageIconColor: theme.muted,
      pageIconInactiveColor: theme.divider,
      pageTextStyle: {
        color: theme.muted,
        fontFamily: theme.font,
      },
      textStyle: {
        color: theme.text,
      },
    },
    tooltip: {
      trigger: 'item',
      renderMode: 'html',
      backgroundColor: theme.surface,
      borderColor: theme.divider,
      textStyle: {
        color: theme.text,
      },
      formatter: (/** @type {{ data?: { id?: string } }} */ item) => {
        let point = model.points.find((point) => point.id === item.data?.id);
        let content = document.createElement('div');
        content.style.whiteSpace = 'pre-wrap';
        content.textContent = point ? [
          point.x,
          ...state.series.map((series, index) => `${series.label}: ${point.formatted[index]}`),
        ].join('\n') : '';
        return content;
      },
    },
    ...(state.type === 'donut' ? {} : {
      grid: {
        left: '3%',
        right: '3%',
        top: 44,
        bottom: 16,
        outerBoundsMode: 'same',
        outerBoundsContain: 'all',
      },
      xAxis: {
        type: 'category',
        data: model.points.map((point) => point.x),
        name: state.xLabel,
        nameLocation: 'middle',
        nameGap: 28,
        axisLabel: {
          color: theme.muted,
        },
        axisLine: {
          lineStyle: {
            color: theme.divider,
          },
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: theme.muted,
          formatter: (/** @type {number} */ value) => `${format.format(value)}${state.series[0].unit ? ` ${state.series[0].unit}` : ''}`,
        },
        splitLine: {
          lineStyle: {
            color: theme.divider,
          },
        },
      },
    }),
    series,
  };
}
