import type { SessionRecord } from './session.js';
import type { DELIVERY_STATE, FEEDBACK_STATE, FEEDBACK_FAILURES } from '../src/feedback/constants.js';

export type FeedbackJson = null | boolean | number | string | FeedbackJson[]
  | { [key: string]: FeedbackJson };

export type FeedbackSessionIdentity = Pick<SessionRecord, 'sessionId' | 'instanceId'>;
export type FeedbackRevision = string | number;

export interface FeedbackEvent {
  type: string;
  source: string;
  data: FeedbackJson;
}

export interface FeedbackReference {
  submissionId: string;
  instanceId: string;
  revision?: FeedbackRevision;
}

export interface FeedbackSubmission extends FeedbackReference {
  event: FeedbackEvent;
}

/** Worker-owned routing; never accepted from the page. */
export interface FeedbackEnvelope extends FeedbackSubmission {
  sessionId: string;
  conversationId: string;
}

export type FeedbackPayloadInput =
  | { channel: 'stdin' }
  | { channel: 'argument'; index: number };

/** Private configuration, not part of saved definitions or public status. */
export interface FeedbackCommand {
  executable: string;
  args: string[];
  cwd?: string;
  input: FeedbackPayloadInput;
}

export interface FeedbackRegistration extends FeedbackSessionIdentity {
  conversationId: string;
  command: FeedbackCommand;
}

export interface FeedbackFailure {
  code: keyof typeof FEEDBACK_FAILURES;
  /** AGUI-owned explanation, never raw command output. */
  message: string;
}

/** One JSON object on stdout; acknowledgement of native delivery only. */
export type FeedbackHandlerResult =
  | { state: 'accepted'; receiptId?: string }
  | { state: 'unavailable' | 'rejected' | 'unknown' };

export type FeedbackExecution = FeedbackHandlerResult & { failure?: FeedbackFailure };

export interface FeedbackReceipt {
  fingerprint: string;
  delivery: FeedbackDelivery;
}

export interface FeedbackDelivery extends FeedbackReference {
  state: typeof DELIVERY_STATE[keyof typeof DELIVERY_STATE];
  receiptId?: string;
  failure?: FeedbackFailure;
}

/** Application-owned; only verified external writes may become persisted. */
export interface FeedbackPersistence extends FeedbackReference {
  state: 'pending' | 'persisted' | 'failed' | 'unknown';
  failure?: FeedbackFailure;
}

/** Safe for CLI status and page transport. Contains no handler or routing data. */
export interface FeedbackStatus {
  instanceId: string;
  state: typeof FEEDBACK_STATE[keyof typeof FEEDBACK_STATE];
  pending: number;
  lastDelivery?: FeedbackDelivery;
  failure?: FeedbackFailure;
}
