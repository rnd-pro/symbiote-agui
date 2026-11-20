import type { UiDataOption, UiDataRecord } from './uilib-data.js';
import type { UiTexts } from './uilib.js';

export type UiKanbanIssue = 'invalidRows' | 'invalidColumns' | 'invalidState';
export interface UiKanbanState {
  value: UiDataRecord[];
  columns: UiDataOption[];
  idKey: string;
  statusKey: string;
  titleKey: string;
  descriptionKey: string;
  label: string;
  texts: UiTexts;
  disabled: boolean;
  readonly: boolean;
  loading: boolean;
  error: string;
}
export interface UiKanbanGroup {
  id: string;
  status: string | null;
  label: string;
  tone?: UiDataOption['tone'];
  rows: UiDataRecord[];
}
export interface UiKanbanModel {
  state: UiKanbanState;
  groups: UiKanbanGroup[];
}
export interface UiKanbanAction {
  widgetId: string;
  context: string | null;
  action: 'kanban-change';
  recordId: string;
  status: string;
  totalCount: number;
}
