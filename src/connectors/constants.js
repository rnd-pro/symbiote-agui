export const CONNECTOR_LIMITS = Object.freeze({
  policyBytes: 65536,
  privateBytes: 262144,
  inputBytes: 65536,
  messageBytes: 73728,
  actions: 32,
  pending: 16,
  executionMs: 300000,
});
export const CONNECTOR_ACTION = /^[a-z][a-z0-9_-]{0,63}$/;
export const CONNECTOR_UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export const CONNECTOR_REVISION = /^sha256:[a-f0-9]{64}$/;
export const CONNECTOR_PUBLIC_LIMITS = Object.freeze({
  capabilities: 32,
  resources: 16,
  scalarLength: 256,
  expirySeconds: 86400,
  requestsPerMinute: 120,
  authenticationsPerSocket: 64,
  authenticationsPerMinute: 240,
});
