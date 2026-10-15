import { createReadStream } from 'node:fs';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { errorMessage } from '../shared/system-error.js';
import { MAX_HTML_BYTES } from './constants.js';

/**
 * @param {import('node:stream').Readable} stream
 * @returns {Promise<string>}
 */
export async function readUtf8Markup(stream) {
  /** @type {Buffer[]} */
  let chunks = [];
  let length = 0;

  for await (let chunk of stream.iterator({ destroyOnReturn: false })) {
    let bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += bytes.length;

    if (length > MAX_HTML_BYTES) {
      throw new CommandError(`Input exceeds ${MAX_HTML_BYTES} bytes.`, ERROR_CODE.INPUT_TOO_LARGE, EXIT_CODE.INVALID_INPUT);
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
 */
export async function readMarkup(file, stdin = process.stdin) {
  if (file === undefined && stdin.isTTY) {
    throw new CommandError('Provide input with --file <PATH> or pipe UTF-8 input to stdin.');
  }

  let stream = file === undefined ? stdin : createReadStream(file);

  try {
    return await readUtf8Markup(stream);
  } catch (error) {
    if (error instanceof CommandError) {
      throw error;
    }
    throw new CommandError(`Cannot read input: ${errorMessage(error)}`);
  } finally {
    stream.destroy();
  }
}
