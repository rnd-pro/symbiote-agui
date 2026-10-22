import { PubSub } from '@symbiotejs/symbiote';
import { withoutFeedback } from '../../../feedback-guard.js';
import { transferDocument } from './json.js';
import { TRANSFER_VERSION, transferError } from './constants.js';

/** @param {import('../../../../../../types/data.js').DataTarget[]} targets */
export function draftContexts(targets) {
  return targets.map(({ provider, keys }) => {
    let context = PubSub.getCtx(provider, false);
    if (!context || keys.some((key) => !context.has(key))) { throw transferError('CONTEXT_CHANGED'); }
    return context;
  });
}

/** @param {import('../../../../../../types/data.js').DataTarget[]} targets */
export function captureDraft(targets) {
  let contexts = draftContexts(targets);
  let changes = targets.map(({ provider, keys }, index) => ({ provider,
    values: Object.fromEntries(keys.map((key) => [key, contexts[index].read(key)])) }));
  return transferDocument({ version: TRANSFER_VERSION, changes }, targets).changes;
}

/**
 * @param {import('../../../../../../types/data.js').DataTransferDocument} document
 * @param {import('../../../../../../types/data.js').DataTarget[]} targets
 */
export function replaceDraft(document, targets) {
  let { changes } = transferDocument(document, targets);
  let contexts = draftContexts(targets);
  withoutFeedback(() => {
    for (let [index, target] of targets.entries()) {
      let change = changes.find((change) => change.provider === target.provider);
      if (change) { contexts[index].multiPub(change.values); }
    }
  });
}
