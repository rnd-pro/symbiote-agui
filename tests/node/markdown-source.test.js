import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchMarkdownSource, markdownSourceUrl } from '../../src/page/client/uilib/widgets/markdown/source.js';
import { MARKDOWN_LIMITS } from '../../src/page/client/uilib/widgets/markdown/constants.js';

test('Markdown source URLs resolve HTTP(S) while rejecting credentials and executable/local-file schemes', () => {
  assert.equal(markdownSourceUrl('../notes.md#section', 'https://example.test/app/'), 'https://example.test/notes.md');
  for (let url of [
    'javascript:alert(1)',
    'data:text/markdown,Hello',
    'file:///private/document.md',
    'https://user:secret@example.test/notes.md',
  ]) { assert.throws(() => markdownSourceUrl(url, 'https://example.test/'), /invalidSrc/); }
});

test('Markdown fetches omit credentials/referrers and bound streamed bytes even without Content-Length', async (t) => {
  let response = new Response(new ReadableStream({
    start(controller) {
      let bytes = new TextEncoder().encode('# Notes\n\nHello 🧪');
      controller.enqueue(bytes.slice(0, bytes.length - 2));
      controller.enqueue(bytes.slice(-2));
      controller.close();
    },
  }));
  /** @type {typeof fetch} */
  let fetchSource = async (url, options) => {
    assert.equal(url, 'https://example.test/notes.md');
    assert.equal(options?.credentials, 'omit');
    assert.equal(options?.referrerPolicy, 'no-referrer');
    assert.equal(options?.mode, 'cors');
    return response;
  };
  t.mock.method(globalThis, 'fetch', fetchSource);
  let controller = new AbortController();
  assert.deepEqual(await fetchMarkdownSource('https://example.test/notes.md', controller.signal), {
    text: '# Notes\n\nHello 🧪',
    url: 'https://example.test/notes.md',
  });
  response = new Response('x'.repeat(MARKDOWN_LIMITS.inputBytes + 1));
  await assert.rejects(fetchMarkdownSource('https://example.test/notes.md', controller.signal), /inputTooLarge/);
  response = new Response('Not found', {
    status: 404,
  });
  await assert.rejects(fetchMarkdownSource('https://example.test/notes.md', controller.signal), /fetchFailed/);
});
