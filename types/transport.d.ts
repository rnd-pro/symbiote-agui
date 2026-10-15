import type { ComponentState } from './components.js';

export interface StateUpdate {
  selector: string;
  values: ComponentState;
  method?: 'set$' | 'add$';
  rewrite?: boolean;
}

export interface RenderUpdate {
  html: string;
  revision: number;
  stylesheetUrl: string;
}

export type PageCommand =
  | ({ type: 'render' } & RenderUpdate)
  | ({ type: 'update' } & StateUpdate);

export type ServerMessage = (PageCommand & { id: string }) | { type: 'stop' };

export type PageMessage =
  | { type: 'result'; id: string; error?: string }
  | { type: 'event'; name: string; data: unknown };

export interface SessionEvent {
  id: string;
  name: string;
  data: unknown;
  time: string;
}

export interface EventBatch {
  events: SessionEvent[];
  dropped: number;
}

export interface FragmentAnalysis {
  classes: string[];
  tags: Set<string>;
  providers: Map<string, ComponentState>;
}

export interface PageApi {
  emit(name: string, data?: unknown): boolean;
}

export type ModuleCleanup = () => void | Promise<void>;

export interface PageModule {
  default?(root: HTMLElement, api: PageApi): void | ModuleCleanup | Promise<void | ModuleCleanup>;
}

