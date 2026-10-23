import assert from 'node:assert/strict';
import test from 'node:test';
import { parseHTML } from 'linkedom';
import { markdownHtml } from '../../src/page/client/uilib/widgets/markdown/runtime/index.js';
import { linkDestination } from '../../src/page/client/uilib/widgets/markdown/runtime/policy.js';
import { MARKDOWN_LIMITS } from '../../src/page/client/uilib/widgets/markdown/constants.js';

test('JSDA Markdown preserves HTML, custom wrappers, and images while fenced code stays text', async () => {
  let html = await markdownHtml('# Release notes\n\n<strong>raw</strong>\n\n<example-widget>\n\n### Fallback\n\n```json\n{"zoom":12}\n```\n\n</example-widget>\n\n![Diagram](https://example.test/tracker.png)\n\n```html\n<script>alert(1)</script>\n```');
  assert.match(html, /<h1 id="release-notes">Release notes<\/h1>/);
  assert.equal(html.includes('<strong>raw</strong>'), true);
  assert.equal(html.includes('<example-widget>'), true);
  assert.equal(html.includes('<script>'), false);
  assert.equal(html.includes('<img'), true);
  let document = /** @type {Document} */ (parseHTML(html).document);
  assert.equal(document.querySelector('code.language-html')?.textContent?.trim(), '<script>alert(1)</script>');
  assert.equal(document.querySelector('example-widget h3')?.textContent, 'Fallback');
  assert.deepEqual(JSON.parse(document.querySelector('code.language-json')?.textContent ?? ''), {
    zoom: 12,
  });
  assert.match(html, /Diagram/);
  assert.equal(html.includes('hljs'), true);
});

test('Markdown highlights known code languages and leaves unknown languages as escaped text', async () => {
  let document = /** @type {Document} */ (parseHTML(await markdownHtml('```js\nconst message = "Hello";\n```\n\n```unknown-example\n<b>Literal</b>\n```')).document);
  assert.ok(document.querySelector('code.language-js .hljs-keyword'));
  assert.ok(document.querySelector('code.language-js .hljs-string'));
  assert.equal(document.querySelector('code.language-unknown-example')?.textContent?.trim(), '<b>Literal</b>');
  assert.equal(document.querySelector('code.language-unknown-example b'), null);
});

test('Markdown supports GFM document constructs with disabled task checkboxes', async () => {
  let html = await markdownHtml('## Notes\n\n**Bold**, *italic*, ~~removed~~.\n\n> Quote\n\n1. First\n2. Second\n\n- [x] Ready\n- [ ] Pending\n\n| Name | Status |\n| --- | --- |\n| Demo | Ready |');
  for (let tag of [
    'strong',
    'em',
    'del',
    'blockquote',
    'ol',
    'table',
  ]) { assert.ok(html.includes(`<${tag}`), tag); }
  assert.match(html, /<input[^>]*disabled[^>]*type="checkbox"/);
});

test('Markdown bounds UTF-8 input and expanded output, and accepts only explicit safe URL protocols', async () => {
  await assert.rejects(markdownHtml('🧪'.repeat(MARKDOWN_LIMITS.inputBytes / 4 + 1)), /inputTooLarge/);
  await assert.rejects(markdownHtml('&'.repeat(MARKDOWN_LIMITS.inputBytes)), /outputTooLarge/);
  for (let url of [
    'javascript:alert(1)',
    'java\nscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    '//example.test/',
    '/relative/path',
    'https://user:secret@example.test/',
  ]) { assert.equal(linkDestination(url), undefined); }
  assert.equal(linkDestination('https://example.test/docs'), 'https://example.test/docs');
  assert.equal(linkDestination('mailto:team@example.test'), 'mailto:team@example.test');
});
