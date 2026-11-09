export let DIAGRAM_RUNTIME_PATH = '/client/uilib/widgets/diagram/runtime/index.js';
export let DIAGRAM_LIMITS = Object.freeze({
  inputBytes: 32 * 1024,
  outputBytes: 256 * 1024,
  edges: 300,
  nodes: 5000,
  depth: 64,
});
export let DIAGRAM_ATTRIBUTES = Object.freeze([
  'label',
  'description',
  'loading',
  'error',
]);
