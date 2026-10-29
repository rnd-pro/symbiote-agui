export const PROXY_PATH = '_proxy';

export const PROXY_LIMITS = Object.freeze({
  policyBytes: 16 * 1024,
  origins: 32,
  originLength: 2048,
  timeoutMs: 15_000,
  bodyBytes: 10 * 1024 * 1024,
  redirects: 3,
  concurrentRequests: 8,
  requestsPerMinute: 120,
  urlBytes: 8192,
  headerBytes: 16 * 1024,
});

export const PROXY_SOURCE_HEADER = 'X-AGUI-Source-URL';
