export let DATA_ENDPOINT_KIND = Object.freeze({
  INLINE_JSON: 'inline-json',
  JSON_FILE: 'json-file',
  AGUI_CACHE: 'agui-cache',
  DATABASE: 'database',
  API: 'api',
  MANUAL: 'manual',
  OTHER: 'other',
});

export let METADATA_KEYS = Object.freeze(['dataFlow']);
export let METADATA_LIMITS = Object.freeze({ bytes: 16 * 1024, text: 2048, endpoints: 16, bindings: 32, keys: 64 });
