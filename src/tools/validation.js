import { AjvJsonSchemaValidator } from '@modelcontextprotocol/server/validators/ajv';
import { CommandError } from '../shared/command-error.js';

/**
 * @param {object} schema
 * @param {unknown} input
 */
export function validateToolInput(schema, input) {
  let result;
  try {
    let validator = new AjvJsonSchemaValidator();
    result = validator.getValidator(schema)(input);
  } catch {
    throw new CommandError('The tool schema cannot be validated. Correct its schema before calling.');
  }
  if (!result.valid) {
    throw new CommandError(`Tool input does not match its schema: ${result.errorMessage}`);
  }
}
