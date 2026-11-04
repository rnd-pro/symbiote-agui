import { readFile } from 'node:fs/promises';

export async function execute(input, context) {
  return JSON.parse(await readFile(context.credentials.DATA_FILE, 'utf8'));
}
