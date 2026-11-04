import { readFile, writeFile } from 'node:fs/promises';

export async function execute(input, context) {
  let path = context.credentials.DATA_FILE;
  let model = JSON.parse(await readFile(path, 'utf8'));
  if (!model.records.some((record) => record.id === input.id)) { throw new Error('Unknown record.'); }
  model.records = model.records.map((record) => record.id === input.id ? input : record);
  model.draft = input;
  await writeFile(path, `${JSON.stringify(model, null, 2)}\n`);
  let saved = JSON.parse(await readFile(path, 'utf8'));
  if (!saved.records.some((record) => record.id === input.id && record.label === input.label)) { throw new Error('Readback did not match.'); }
  return context.verified(saved);
}
