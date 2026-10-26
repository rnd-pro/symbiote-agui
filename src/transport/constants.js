export let SOCKET_PATH = 'socket';
export let PAGE_REQUEST_TIMEOUT_MS = 10_000;
export let TOOL_OPERATION_TIMEOUT_MS = 25_000;
export let TOOL_DISCOVERY_TIMEOUT_MS = 2_000;
export let TOOL_DISCOVERY_QUIET_MS = 100;
export let MAX_PAGE_MESSAGE_BYTES = 1024 * 1024;
export let HEARTBEAT_MS = 15_000;
export let MAX_EVENT_BYTES = 16 * 1024;
export let MAX_EVENTS = 100;
export let RECONNECT_MIN_MS = 500;
export let RECONNECT_MAX_MS = 5_000;
export let CONNECTION_STATUS_ID = 'agui-connection';
export let MODULE_SELECTOR = 'script[type="module"][data-agui]';
export let MIRROR_INTERVAL_MS = 100;
export let MIRROR_REFRESH_MS = 1_000;
export let PAGE_ROLE = Object.freeze({ USER: 'user', VIEWER: 'viewer' });
export let SESSION_CONTEXT = 'AGUI_SESSION';

export const ANNOTATION_LIMITS = Object.freeze({
  messageBytes: 8 * 1024,
  messagesPerSecond: 40,
  pointsPerMessage: 32,
  pointsPerStroke: 256,
  strokeMs: 2_000,
  holdMs: 3_000,
  fadeMs: 2_000,
  participants: 128,
  strokes: 64,
  points: 4_096,
  bufferBytes: 64 * 1024,
  sweepMs: 250,
});
