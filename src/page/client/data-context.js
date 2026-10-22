import { PubSub } from '@symbiotejs/symbiote';
import { DATA_CONTEXT } from '../../data/constants.js';
import { withoutFeedback } from './feedback-guard.js';

/** @type {import('../../../types/data.js').DataUiState} */
let initial = { connected: false, current: null, baseRevision: null, stale: false, pending: 0, result: null };
let context = PubSub.registerCtx(/** @type {Record<string, unknown>} */ ({ ...initial }), DATA_CONTEXT);

/** @param {Partial<import('../../../types/data.js').DataUiState>} values */
export function updateDataContext(values) { withoutFeedback(() => context.multiPub({ ...values })); }

/** @returns {import('../../../types/data.js').DataUiState} */
export function getDataState() {
  return structuredClone(/** @type {import('../../../types/data.js').DataUiState} */ (
    Object.fromEntries(Object.keys(initial).map((key) => [key, context.read(key)]))));
}
