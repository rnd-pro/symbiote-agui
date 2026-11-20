import { readFile } from 'node:fs/promises';
import { CommandError } from '../shared/command-error.js';

/**
 * Include only referenced shared definitions, keeping CLI contracts self-contained.
 * @param {Record<string, unknown>} input
 */
export async function templateSchema(input) {
  let schema = structuredClone(input);
  /** @type {Record<string, unknown>} */
  let shared = JSON.parse(await readFile(new URL('../../templates/definitions.json', import.meta.url), 'utf8'));
  /** @type {Record<string, unknown>} */
  let definitions = {
    .../** @type {Record<string, unknown>} */ (schema.$defs ?? {}),
  };
  let visited = new Set();
  /** @param {unknown} value */
  function visit(value) {
    if (!value || typeof value !== 'object') { return; }
    let reference = Reflect.get(value, '$ref');
    if (typeof reference === 'string' && reference.startsWith('#/$defs/')) {
      let key = reference.slice('#/$defs/'.length);
      if (!visited.has(key)) {
        visited.add(key);
        if (!Object.hasOwn(definitions, key)) {
          if (!Object.hasOwn(shared, key)) { throw new CommandError(`Unknown template schema definition: ${key}.`); }
          definitions[key] = shared[key];
        }
        visit(definitions[key]);
      }
    }
    for (let child of Object.values(value)) { visit(child); }
  }
  visit(schema);
  if (Object.keys(definitions).length) { schema.$defs = definitions; }
  return schema;
}
