export interface UiOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export type UiValue = string | boolean;
export type UiControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
export type UiStatus = 'ready' | 'loading' | 'empty' | 'error';
export type UiTexts = Readonly<Record<string, string>>;
export type UiIconName = keyof typeof import('../src/page/client/uilib/content/icon/collection.js').ICON_NAMES;

export interface UiIconState {
  name: UiIconName | '';
}

export interface UiControlState {
  value: UiValue;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  requiredMark?: string;
}

export interface UiSelectState extends UiControlState {
  value: string;
  options: UiOption[];
  placeholder?: string;
}

export interface UiSidebarState {
  value: boolean;
  label?: string;
  expandLabel?: string;
  collapseLabel?: string;
  disabled?: boolean;
  readonly?: boolean;
}

export interface UiTabsState {
  value: string;
  label?: string;
  orientation?: 'horizontal' | 'vertical';
  disabled?: boolean;
  readonly?: boolean;
}

export interface UiTabState {
  value: string;
  label?: string;
  disabled?: boolean;
}

export interface UiDialogState {
  value: boolean;
  label?: string;
  openLabel?: string;
  closeLabel?: string;
}

export interface UiFeedbackState {
  status: UiStatus;
  message?: string;
  retryLabel?: string;
}

export interface UiMessageState {
  message: string;
  tone?: 'info' | 'alert';
  timeout?: number;
  closeLabel?: string;
}

export interface UiAction {
  widgetId: string;
  context: string | null;
  action: 'change' | 'retry';
  value?: UiValue;
  valueLength?: number;
}
