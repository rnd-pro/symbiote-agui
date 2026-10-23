import type { UiTexts } from './uilib.js';
import type { UiDataField, UiDataRecord } from './uilib-data.js';

export type UiTableRecord = UiDataRecord;
export type UiTableSelection = 'none' | 'single' | 'multiple';
export type UiTableProperty = 'value' | 'sort' | 'page';
export type UiTableIssue = 'invalidRows' | 'invalidColumns' | 'invalidState';
export interface UiTableColumn extends UiDataField {
  sortable?: boolean;
}
export interface UiTableSort {
  key: string;
  direction: 'ascending' | 'descending';
}
export interface UiTableState {
  rows: UiTableRecord[];
  columns: UiTableColumn[];
  value: string[];
  filteredIds: string[] | null;
  sort: UiTableSort | null;
  idKey: string;
  selection: UiTableSelection;
  locale: string;
  page: number;
  pageSize: number;
  label: string;
  texts: UiTexts;
  disabled: boolean;
  readonly: boolean;
  loading: boolean;
  error: string;
}
export interface UiTableModel {
  state: UiTableState;
  filtered: UiTableRecord[];
  visible: UiTableRecord[];
  selected: string[];
  page: number;
  pageCount: number;
}
export interface UiTableAction {
  widgetId: string;
  context: string | null;
  action: 'table-change';
  property: UiTableProperty;
  selectedCount: number;
  filteredCount: number;
}
