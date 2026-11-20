import type { UiDataRecord } from './uilib-data.js';

export type UiExplorerNode = UiDataRecord & {
  id: string;
  label: string;
  parentId?: string;
  branch?: boolean;
  loaded?: boolean;
  loading?: boolean;
  more?: boolean;
  disabled?: boolean;
  icon?: string;
  message?: string;
};

export interface UiExplorerRequest {
  id: string;
  action: 'expand' | 'more' | 'retry';
}
