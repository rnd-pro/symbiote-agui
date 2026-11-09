import assert from 'node:assert/strict';
import test from 'node:test';
import { diagramSvg } from '../../src/uilib/widgets/diagram/runtime/render.js';
import { diagramSourceIssue } from '../../src/uilib/widgets/diagram/source.js';
import { DIAGRAM_LIMITS } from '../../src/uilib/widgets/diagram/constants.js';

test('diagram rendering accepts flowcharts, sequences, and relationships without executable links or HTML', () => {
  for (let source of [
    'flowchart LR\n A[Draft] --> B[Review]',
    'sequenceDiagram\n User->>App: Submit\n App-->>User: Accepted',
    'erDiagram\n PROJECT ||--o{ TASK : contains',
  ]) {
    let svg = diagramSvg(source, 'test-diagram-');
    assert.match(svg, /^<svg\s/);
    assert.doesNotMatch(svg, /<(?:script|foreignObject|image|a)\b/i);
  }
  let svg = diagramSvg('flowchart LR\n A["<img src=x onerror=alert(1)>"] --> B[Output]\n click B "https://example.test/"', 'safe-');
  assert.doesNotMatch(svg, /<(?:script|image|img|a)\b/i);
});

test('diagram sources reject invalid values, oversized UTF-8 input, syntax, unsupported types, and excessive edges', () => {
  assert.equal(diagramSourceIssue(null), 'invalidValue');
  assert.equal(diagramSourceIssue('  '), 'empty');
  let source = `flowchart LR\n A["${'é'.repeat(DIAGRAM_LIMITS.inputBytes / 2)}"]`;
  assert.equal(diagramSourceIssue(source), 'inputTooLarge');
  assert.throws(() => diagramSvg(source, 'large-'), /inputTooLarge/);
  assert.throws(() => diagramSvg('unknownDiagram\n A --> B', 'bad-'), /unsupported/);
  assert.throws(() => diagramSvg('flowchart LR\n A[', 'bad-'), /invalidSource/);
  let edges = Array.from({
    length: DIAGRAM_LIMITS.edges + 1,
  }, (_, index) => `A${index} --> A${index + 1}`).join('\n');
  assert.throws(() => diagramSvg(`flowchart LR\n${edges}`, 'large-'), /limitExceeded/);
});
