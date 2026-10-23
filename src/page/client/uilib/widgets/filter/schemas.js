import { DATA_LIMITS } from '../../shared/data/constants.js';

export let FILTER_VALUE_SCHEMA = {
  anyOf: [
    {
      type: 'string',
      maxLength: DATA_LIMITS.text,
    },
    {
      type: 'object',
      properties: Object.fromEntries([
        'min',
        'max',
      ].map((key) => [
        key,
        {
          anyOf: [
            {
              type: 'number',
            },
            {
              type: 'string',
              maxLength: DATA_LIMITS.text,
            },
          ],
        },
      ])),
      additionalProperties: false,
    },
  ],
};
