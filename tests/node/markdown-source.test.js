import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchMarkdownSource, markdownSourceUrl } from '../../src/page/client/uilib/widgets/markdown/source.js';
import { MARKDOWN_LIMITS } from '../../src/page/client/uilib/widgets/markdown/constants.js';
import { PROXY_SOURCE_HEADER } from '../../src/proxy/constants.js';

test('Markdown source URLs resolve HTTP(S) while rejecting credentials and executable/local-file schemes', () => {
  assert.equal(markdownSourceUrl('../notes.md#section', 'https://example.test/app/'), 'https://example.test/notes.md');
  for (let url of [
    'javascript:alert(1)',
    'data:text/markdown,Hello',
    'file:///private/document.md',
    'https://user:secret@example.test/notes.md',
  ]) { assert.throws(() => markdownSourceUrl(url, 'https://example.test/'), /invalidSrc/); }
});

/**
 * @param {string} url
 * @param {string | undefined} source
 * @param {boolean} [redirected]
 */
function sourceResponse(url, source, redirected = false) {
  let response = new Response('# Notes', {
    headers: source === undefined ? {} : {
      [PROXY_SOURCE_HEADER]: source,
    },
  });
  Object.defineProperties(response, {
    url: {
      value: url,
    },
    redirected: {
      value: redirected,
    },
  });
  return response;
}

test('Markdown uses proxy source metadata only from the exact same-origin session endpoint', async (t) => {
  let requested = 'http://ui.test/desk/_proxy?url=https%3A%2F%2Fsource.test%2Fnotes.md';
  let upstream = 'https://cdn.test/docs/redirected.md';
  let response = sourceResponse(requested, upstream);
  t.mock.method(globalThis, 'fetch', async () => response);
  let signal = new AbortController().signal;
  assert.equal((await fetchMarkdownSource(requested, signal, 'http://ui.test/desk/')).url, upstream);
  let shared = requested.replace('http://ui.test', 'https://shared.test');
  response = sourceResponse(shared, upstream);
  assert.equal((await fetchMarkdownSource(shared, signal, 'https://shared.test/desk/?mode=user')).url, upstream);
  for (let url of [
    'https://external.test/desk/_proxy?url=notes.md',
    'http://ui.test/another/_proxy?url=notes.md',
    'http://ui.test/desk/notes.md',
  ]) {
    response = sourceResponse(url, upstream);
    assert.equal((await fetchMarkdownSource(url, signal, 'http://ui.test/desk/')).url, url);
  }
});

test('Markdown rejects malformed or redirected proxy metadata and cancels unread bodies', async (t) => {
  let requested = 'http://ui.test/desk/_proxy?url=https%3A%2F%2Fsource.test%2Fnotes.md';
  let response = sourceResponse(requested, undefined);
  t.mock.method(globalThis, 'fetch', async () => response);
  for (let source of [
    undefined,
    '/relative.md',
    'javascript:alert(1)',
    'https://user:secret@source.test/notes.md',
    'https://source.test/notes.md#fragment',
    'https://source.test/a b.md',
    'https://source.test\\notes.md',
  ]) {
    response = sourceResponse(requested, source);
    await assert.rejects(fetchMarkdownSource(requested, new AbortController().signal, 'http://ui.test/desk/'), /fetchFailed/);
    assert.equal(response.body?.locked, false);
    assert.equal((await response.body?.getReader().read())?.done, true);
  }
  for (let actual of [
    'https://external.test/desk/_proxy?url=notes.md',
    'http://ui.test/desk/notes.md',
  ]) {
    response = sourceResponse(actual, 'https://source.test/notes.md');
    await assert.rejects(fetchMarkdownSource(requested, new AbortController().signal, 'http://ui.test/desk/'), /fetchFailed/);
  }
  response = sourceResponse(requested, 'https://source.test/notes.md', true);
  await assert.rejects(fetchMarkdownSource(requested, new AbortController().signal, 'http://ui.test/desk/'), /fetchFailed/);
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
