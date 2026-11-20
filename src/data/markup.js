import { parseMarkup, serializeMarkup } from '../markup/parse.js';
import { MAX_HTML_BYTES } from '../markup/constants.js';
import { dataTargets, writeDataScript } from './targets.js';

/** @param {string} html */
export function declaredData(html) {
  return [...dataTargets(parseMarkup(html).content)].map(([provider, { keys }]) => ({ provider, keys }));
}

/**
 * @param {string} html
 * @param {import('../../types/data.js').DataChange[]} changes
 */
export function patchData(html, changes) {
  let template = parseMarkup(html);
  let targets = dataTargets(template.content);
  for (let change of changes) {
    let target = targets.get(change.provider);
    if (!target || Object.keys(change.values).some((key) => !target.keys.includes(key))) { throw new Error('Undeclared persisted data.'); }
    writeDataScript(target.script, { ...target.values, ...change.values });
  }
  let result = serializeMarkup(template);
  if (Buffer.byteLength(result) > MAX_HTML_BYTES) { throw new Error('Saved markup exceeds 1 MiB.'); }
  return result;
}

/**
 * @param {string} source
 * @param {string} saved
 */
export function mergeSavedData(source, saved) {
  let targets = dataTargets(parseMarkup(source).content);
  let previous = dataTargets(parseMarkup(saved).content);
  /** @type {import('../../types/data.js').DataChange[]} */
  let changes = [];
  for (let [provider, before] of previous) {
    let next = targets.get(provider);
    if (!next || before.keys.some((key) => !next.keys.includes(key))) { throw new Error('Persisted declarations changed.'); }
    for (let key of before.keys) {
      let oldValue = before.values[key];
      let newValue = next.values[key];
      if (oldValue !== null && newValue !== null && (typeof oldValue !== typeof newValue || Array.isArray(oldValue) !== Array.isArray(newValue))) {
        throw new Error('Persisted data type changed.');
      }
    }
    changes.push({ provider, values: /** @type {import('../../types/data.js').DataChange['values']} */ (Object.fromEntries(before.keys.map((key) => [key, before.values[key]]))) });
  }
  return changes.length ? patchData(source, changes) : source;
}
