import { init, use } from 'echarts/core';
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { LabelLayout } from 'echarts/features';
import { SVGRenderer } from 'echarts/renderers';
import { chartOption } from './option.js';

use([
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  LabelLayout,
  SVGRenderer,
]);

/**
 * @param {HTMLElement} container
 * @param {(id: string) => void} onSelect
 * @returns {import('../../../../../../../types/uilib-chart.js').UiChartRenderer}
 */
export function createChartRenderer(container, onSelect) {
  let chart = init(container, null, {
    renderer: 'svg',
  });
  chart.on('click', (event) => {
    let data = /** @type {{ id?: unknown } | undefined} */ (event.data);
    if (typeof data?.id === 'string') { onSelect(data.id); }
  });
  return {
    render(model, theme) {
      chart.resize({
        silent: true,
      });
      chart.setOption(chartOption(model, theme), {
        notMerge: true,
        silent: true,
      });
    },
    dispose() { chart.dispose(); },
  };
}
