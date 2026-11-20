import type { UiDataRecord, UiDataSelection } from './uilib-data.js';
import type { UiTexts } from './uilib.js';

export type UiChartType = 'line' | 'bar' | 'donut';
export type UiChartColor = 'accent' | 'success' | 'warning' | 'danger' | 'muted';
export type UiChartIssue = 'invalidRows' | 'invalidSeries' | 'invalidState';
export interface UiChartSeries {
  key: string;
  valueKey: string;
  label: string;
  color?: UiChartColor;
  format?: 'number' | 'currency' | 'percent';
  currency?: string;
  digits?: number;
  unit?: string;
}
export interface UiChartState {
  rows: UiDataRecord[];
  series: UiChartSeries[];
  value: string[];
  type: UiChartType;
  selection: UiDataSelection;
  idKey: string;
  xKey: string;
  xLabel: string;
  xType: 'text' | 'number' | 'date';
  locale: string;
  label: string;
  description: string;
  texts: UiTexts;
  disabled: boolean;
  readonly: boolean;
  loading: boolean;
  error: string;
}
export interface UiChartPoint {
  id: string;
  x: string;
  values: (number | null)[];
  formatted: string[];
}
export interface UiChartModel {
  state: UiChartState;
  points: UiChartPoint[];
  selected: string[];
  hasData: boolean;
}
export interface UiChartAction {
  widgetId: string;
  context: string | null;
  action: 'chart-change';
  selectedCount: number;
  totalCount: number;
}
export interface UiChartTheme {
  text: string;
  muted: string;
  divider: string;
  surface: string;
  colors: Record<UiChartColor, string>;
  font: string;
  reducedMotion: boolean;
}
export interface UiChartRenderer {
  render(model: UiChartModel, theme: UiChartTheme): void;
  dispose(): void;
}
