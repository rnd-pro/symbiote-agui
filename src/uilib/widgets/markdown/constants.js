export let MARKDOWN_RUNTIME_PATH = '/client/uilib/widgets/markdown/runtime/index.js';
export let MARKDOWN_SANITIZER_PATH = '/client/uilib/widgets/markdown/sanitizer/index.js';
export let MARKDOWN_LIMITS = Object.freeze({
  inputBytes: 64 * 1024,
  outputBytes: 256 * 1024,
  nodes: 5000,
  depth: 32,
  fetchTimeoutMs: 15_000,
});
export let MARKDOWN_ATTRIBUTES = Object.freeze({
  label: 'label',
  src: 'src',
  loading: 'loading',
  error: 'error',
});
