import { CHART_COLORS } from './constants.js';

/**
 * @param {HTMLElement} element
 * @returns {import('../../../../../../types/uilib-chart.js').UiChartTheme}
 */
export function chartTheme(element) {
  let style = getComputedStyle(element);
  // Computed color resolves light-dark() and custom token expressions for SVG.
  let probe = document.createElement('span');
  probe.hidden = true;
  element.append(probe);
  let color = (/** @type {string} */ token) => {
    probe.style.color = `var(--agui-${token})`;
    return getComputedStyle(probe).color;
  };
  let result = {
    text: color('text'),
    muted: color('muted'),
    divider: color('divider'),
    surface: color('surface'),
    colors: /** @type {Record<import('../../../../../../types/uilib-chart.js').UiChartColor, string>} */ (Object.fromEntries(CHART_COLORS.map((key) => [
      key,
      color(key),
    ]))),
    font: style.fontFamily,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
  probe.remove();
  return result;
}

/** @param {import('./chart.js').Chart} chart */
export function watchChart(chart) {
  let repaint = () => chart.schedulePaint();
  let resize = new ResizeObserver(repaint);
  resize.observe(chart.ref.plot);
  let theme = new MutationObserver(repaint);
  for (let element of [
    chart,
    document.body,
    document.documentElement,
  ]) {
    theme.observe(element, {
      attributes: true,
      attributeFilter: [
        'class',
        'style',
        'data-theme',
      ],
    });
  }
  let media = [
    matchMedia('(prefers-color-scheme: dark)'),
    matchMedia('(prefers-reduced-motion: reduce)'),
  ];
  for (let query of media) { query.addEventListener('change', repaint); }
  return () => {
    resize.disconnect();
    theme.disconnect();
    for (let query of media) { query.removeEventListener('change', repaint); }
  };
}
