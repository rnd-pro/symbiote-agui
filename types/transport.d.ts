import type { ComponentState } from './components.js';
import type { FeedbackDelivery, FeedbackStatus, FeedbackSubmission, FeedbackReference, FeedbackEvent, FeedbackSubmitOptions } from './feedback.js';
import type { DataCommit, DataReference, DataResult, DataStatus, DataTarget } from './data.js';

export type DataPageMessage =
  | { type: 'data-commit'; commit: DataCommit }
  | { type: 'data-read'; references: DataReference[] };

export type DataServerMessage =
  | { type: 'data-status'; data: DataStatus }
  | { type: 'data-result'; result: DataResult };

export type SessionInformationPageMessage = { type: 'session-info-read'; id: string };
export type SessionInformationServerMessage = { type: 'session-info'; id: string; info: SessionInformation | null };

export interface SessionInformation {
  sessionId: string;
  description: string;
  metadata: import('./metadata.js').SessionMetadata;
}

export interface SessionUiState {
  connected: boolean;
  role: PageRole;
  userConnected: boolean;
  information: SessionInformation | null;
  informationState: 'idle' | 'loading' | 'ready' | 'failed';
}

export type FeedbackPageMessage =
  | { type: 'feedback-submit'; submission: FeedbackSubmission }
  | { type: 'feedback-read'; references: FeedbackReference[] };

export type FeedbackServerMessage =
  | { type: 'feedback-status'; feedback: FeedbackStatus }
  | { type: 'feedback-result'; delivery: FeedbackDelivery };

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

export type PageRole = 'user' | 'viewer';

export interface MirrorSnapshot extends RenderUpdate {
  rootStyles?: string;
  theme?: string;
}

export interface PageRoleMessage {
  type: 'role';
  role: PageRole;
  userConnected: boolean;
  revision: number;
  capture: boolean;
}

export interface AnnotationPoint {
  anchor: string;
  x: number;
  y: number;
}

export interface AnnotationParticipant {
  id: string;
  color: string;
}

export interface AnnotationPresence extends AnnotationParticipant {
  point: AnnotationPoint | null;
  updatedAt: number;
}

export interface AnnotationStroke {
  id: string;
  viewerId: string;
  color: string;
  points: AnnotationPoint[];
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  ended: boolean;
}

export type AnnotationPageMessage = {
  type: 'annotation';
  revision: number;
  sequence: number;
} & (
  | { action: 'cursor'; point: AnnotationPoint | null }
  | { action: 'stroke'; phase: 'start' | 'append' | 'end'; points: AnnotationPoint[] }
  | { action: 'sync' }
);

export type AnnotationServerMessage = {
  type: 'annotations';
  revision: number;
  time: number;
} & (
  | { action: 'state'; self: AnnotationParticipant | null; participants: AnnotationPresence[]; strokes: AnnotationStroke[] }
  | { action: 'join'; participant: AnnotationPresence }
  | { action: 'leave'; viewerId: string }
  | { action: 'cursor'; viewerId: string; point: AnnotationPoint | null }
  | { action: 'stroke'; stroke: AnnotationStroke; append: boolean }
  | { action: 'remove'; ids: string[] }
  | { action: 'reset' }
);

export type PageCommand =
  | ({ type: 'render' } & RenderUpdate)
  | ({ type: 'update' } & StateUpdate)
  | { type: 'tools' }
  | { type: 'call'; discoveryId: string; name: string; input: Record<string, unknown>; deadline: number };

export type ServerMessage = (PageCommand & { id: string }) | { type: 'stop' }
  | PageRoleMessage | ({ type: 'snapshot' } & MirrorSnapshot) | FeedbackServerMessage | DataServerMessage | SessionInformationServerMessage | AnnotationServerMessage;

export type PageMessage =
  | FeedbackPageMessage
  | DataPageMessage
  | SessionInformationPageMessage
  | AnnotationPageMessage
  | ({ type: 'snapshot' } & MirrorSnapshot)
  | { type: 'result'; id: string; result?: unknown; error?: string }
  | { type: 'hello'; title: string }
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
  submitFeedback(event: FeedbackEvent, options: FeedbackSubmitOptions): Promise<FeedbackDelivery>;
  commitData(targets: DataTarget[], options?: { commitId?: string }): Promise<DataResult>;
}

export type ModuleCleanup = () => void | Promise<void>;

export interface PageModule {
  default?(root: HTMLElement, api: PageApi): void | ModuleCleanup | Promise<void | ModuleCleanup>;
}

