import type { UiDataRecord, UiSelectionSource } from './uilib-data.js';
import type { UiTexts } from './uilib.js';

export interface UiListSelectionEvent {
  target: EventTarget | null;
  type?: string;
  defaultPrevented?: boolean;
}

export interface UiListState extends UiSelectionSource {
  value: string[];
  filteredIds: string[] | null;
  label: string;
  texts: UiTexts;
  disabled: boolean;
  readonly: boolean;
  loading: boolean;
  error: string;
}

export interface UiListModel {
  state: UiListState;
  filtered: UiDataRecord[];
  selected: string[];
}
