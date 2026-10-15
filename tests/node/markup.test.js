import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';
import { MAX_HTML_BYTES } from '../../src/markup/constants.js';
import { readMarkup, readUtf8Markup } from '../../src/markup/read-input.js';

test('stdin decodes UTF-8 split across chunks and allows empty content', async () => {
  let bytes = Buffer.from('<p>café</p>');
  let input = Readable.from([bytes.subarray(0, 7), bytes.subarray(7)]);
  assert.equal(await readMarkup(undefined, input), '<p>café</p>');
  assert.equal(await readMarkup(undefined, Readable.from([])), '');
});

test('interactive stdin requires a file or redirected input', async () => {
  let input = Object.assign(Readable.from([]), { isTTY: true });
  await assert.rejects(readMarkup(undefined, input), { code: 'INVALID_INPUT', exitCode: 2 });
});

test('invalid encoding and oversized input produce actionable errors', async () => {
  await assert.rejects(readUtf8Markup(Readable.from([Buffer.from([0xc3, 0x28])])), { code: 'INVALID_INPUT' });
  await assert.rejects(readUtf8Markup(Readable.from([Buffer.alloc(MAX_HTML_BYTES + 1)])), { code: 'INPUT_TOO_LARGE', exitCode: 2 });
});
