import type { UiTexts } from './uilib.js';
import type { UiDataField, UiDataRecord } from './uilib-data.js';

export interface UiFilterRange {
  min?: number | string;
  max?: number | string;
}
export type UiFilterValue = Record<string, string | UiFilterRange>;
export type UiFilterIssue = 'invalidRows' | 'invalidFields' | 'invalidState';
export interface UiFilterState {
  rows: UiDataRecord[];
  fields: UiDataField[];
  value: UiFilterValue;
  query: string;
  idKey: string;
  locale: string;
  label: string;
  texts: UiTexts;
  disabled: boolean;
  readonly: boolean;
  loading: boolean;
  error: string;
}
export interface UiFilterModel {
  state: UiFilterState;
  ids: string[];
}
export interface UiFilterAction {
  widgetId: string;
  context: string | null;
  action: 'filter-change';
  property: 'value' | 'query';
  resultCount: number;
}
