/**
 * @param {import('../../../../../../types/data-toolbar.js').SavedReference} expected
 * @param {import('../../../../../../types/data-toolbar.js').SavedReference} actual
 */
export function sameSubmission(expected, actual) {
  return ['commitId', 'instanceId', 'markupRevision', 'revision'].every((key) => Reflect.get(expected, key) === Reflect.get(actual, key));
}

/**
 * @param {import('../../../../../../types/data.js').DataChange[]} baseline
 * @param {import('../../../../../../types/data-toolbar.js').SavedDataSelection} input
 */
export function selectSavedData(baseline, input) {
  let change = baseline.find((change) => change.provider === input.provider);
  if (!change || !Object.hasOwn(change.values, input.key)) { throw new Error('Undeclared saved property.'); }
  let value = change.values[input.key];
  for (let key of input.path ?? []) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, key)) { throw new Error('Saved data path does not exist.'); }
    value = Reflect.get(value, key);
  }
  let offset = input.offset ?? 0;
  let limit = input.limit ?? 20;
  let total = 1;
  let data = value;
  if (Array.isArray(value)) { total = value.length; data = value.slice(offset, offset + limit); }
  else if (typeof value === 'string') { total = value.length; data = value.slice(offset, offset + limit); }
  else if (value && typeof value === 'object') {
    let entries = Object.entries(value); total = entries.length; data = Object.fromEntries(entries.slice(offset, offset + limit));
  }
  let result = { ...input, offset, total, data, nextOffset: offset + limit < total ? offset + limit : null };
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > 8192) { throw new Error('Select a nested path or smaller limit to read at most 8 KiB.'); }
  return structuredClone(result);
}
