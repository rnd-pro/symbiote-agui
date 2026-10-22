import { createReadStream } from 'node:fs';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { errorMessage } from '../shared/system-error.js';
import { MAX_HTML_BYTES } from './constants.js';

/**
 * @param {import('node:stream').Readable} stream
 * @param {number} [maxBytes]
 * @returns {Promise<string>}
 */
export async function readUtf8Markup(stream, maxBytes = MAX_HTML_BYTES) {
  /** @type {Buffer[]} */
  let chunks = [];
  let length = 0;

  for await (let chunk of stream.iterator({ destroyOnReturn: false })) {
    let bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += bytes.length;

    if (length > maxBytes) {
      throw new CommandError(`Input exceeds ${maxBytes} bytes.`, ERROR_CODE.INPUT_TOO_LARGE, EXIT_CODE.INVALID_INPUT);
    }
    chunks.push(bytes);
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
  } catch {
    throw new CommandError('Input must be valid UTF-8.');
  }
}

/**
 * @param {string | undefined} file
 * @param {import('../../types/markup.js').MarkupInput} stdin
 * @param {number} [maxBytes]
 */
export async function readMarkup(file, stdin = process.stdin, maxBytes = MAX_HTML_BYTES) {
  if (file === undefined && stdin.isTTY) {
    throw new CommandError('Provide input with --file <PATH> or pipe UTF-8 input to stdin.');
  }

  let stream = file === undefined ? stdin : createReadStream(file);

  try {
    return await readUtf8Markup(stream, maxBytes);
  } catch (error) {
    if (error instanceof CommandError) {
      throw error;
    }
    throw new CommandError(`Cannot read input: ${errorMessage(error)}`);
  } finally {
    stream.destroy();
  }
}
