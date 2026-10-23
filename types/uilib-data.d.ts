import type { UiOption } from './uilib.js';

export type UiDataSelection = 'none' | 'single' | 'multiple';
export type UiDataRecord = Record<string, unknown>;
export interface UiDataOption extends UiOption {
  tone?: 'info' | 'success' | 'warning' | 'danger';
}
export interface UiDataField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'status';
  filter?: 'contains' | 'equals' | 'range';
  options?: UiDataOption[];
}
