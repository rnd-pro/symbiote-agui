import { validateSchema } from '../shared/schema.js';

/**
 * @param {object} schema
 * @param {unknown} input
 */
export function validateToolInput(schema, input) {
  validateSchema(schema, input, {
    schemaError: 'The tool schema cannot be validated. Correct its schema before calling.',
    inputError: 'Tool input does not match its schema',
  });
}
