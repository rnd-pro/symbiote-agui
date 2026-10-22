export interface UiOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export type UiValue = string | boolean;
export type UiControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
export type UiStatus = 'ready' | 'loading' | 'empty' | 'error';
export type UiTexts = Readonly<Record<string, string>>;

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

export interface UiFeedbackState {
  status: UiStatus;
  message?: string;
  retryLabel?: string;
}

export interface UiAction {
  widgetId: string;
  context: string | null;
  action: 'change' | 'retry';
  value?: UiValue;
  valueLength?: number;
}
