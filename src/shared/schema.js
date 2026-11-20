import { AjvJsonSchemaValidator } from '@modelcontextprotocol/server/validators/ajv';
import { CommandError } from './command-error.js';

/**
 * @param {object} schema
 * @param {unknown} input
 * @param {{ schemaError: string; inputError: string }} messages
 */
export function validateSchema(schema, input, messages) {
  let result;
  try {
    let validator = new AjvJsonSchemaValidator();
    result = validator.getValidator(schema)(input);
  } catch {
    throw new CommandError(messages.schemaError);
  }
  if (!result.valid) {
    throw new CommandError(`${messages.inputError}: ${result.errorMessage}`);
  }
}
