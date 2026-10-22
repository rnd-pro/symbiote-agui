import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { readDataCommit } from '../../../data.js';
import { getDataState } from '../../../data-context.js';
import { sameSubmission, selectSavedData } from './saved-data.js';

export let REFERENCE_SCHEMA = {
  commitId: { type: 'string', format: 'uuid' }, instanceId: { type: 'string', format: 'uuid' },
  markupRevision: { type: 'integer', minimum: 0 }, revision: { type: 'string', format: 'uuid' },
};

/** @param {import('./data-toolbar.js').DataToolbar} toolbar */
export function submissionTools(toolbar) {
  return {
    read_saved_data: new ToolDescriptor({
      description: 'Read up to 8 KiB of committed provider data, only for an exact current submission reference. Use path and pagination for large values.',
      inputSchema: { type: 'object', properties: { ...REFERENCE_SCHEMA, provider: { type: 'string', maxLength: 128 }, key: { type: 'string', maxLength: 128 },
        path: { type: 'array', maxItems: 32, items: { type: 'string', maxLength: 128 } },
        offset: { type: 'integer', minimum: 0 }, limit: { type: 'integer', minimum: 1, maximum: 100 } },
      required: [...Object.keys(REFERENCE_SCHEMA), 'provider', 'key'], additionalProperties: false },
      execute: async (input) => {
        let { commitId, instanceId, markupRevision } = input;
        let receipt = await readDataCommit({ commitId, instanceId, markupRevision });
        let current = getDataState().current;
        if (receipt.state !== 'committed' || !sameSubmission(input, { ...receipt, revision: receipt.revision ?? '' })
          || !current || current.instanceId !== instanceId || current.revision !== input.revision || toolbar.baselineRevision !== input.revision) {
          throw new Error('The submitted snapshot is unavailable or superseded. Reconcile before writing externally.');
        }
        return selectSavedData(toolbar.baseline, input);
      },
    }),
    acknowledge_submission: new ToolDescriptor({
      description: 'Report a verified external operation or its failure for the exact submitted snapshot. Delivery alone is not verification.',
      inputSchema: { type: 'object', properties: { ...REFERENCE_SCHEMA, state: { enum: ['verified', 'failed', 'unknown'] }, message: { type: 'string', maxLength: 512 } },
        required: [...Object.keys(REFERENCE_SCHEMA), 'state'], additionalProperties: false },
      execute: (input) => toolbar.acknowledge(input),
    }),
    read_submission_status: new ToolDescriptor({
      description: 'Read local-save, delivery, external result, and edit status without application records.',
      execute: () => ({ dirty: toolbar.$.dirty, targets: toolbar.targets, submission: toolbar.submission ? {
        reference: toolbar.submission.reference, result: toolbar.submission.result,
        delivery: toolbar.submission.delivery, external: toolbar.submission.external,
      } : null }),
    }),
  };
}
