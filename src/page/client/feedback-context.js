import { PubSub } from '@symbiotejs/symbiote';
import { FEEDBACK_CONTEXT } from '../../feedback/constants.js';
import { withoutFeedback } from './feedback-guard.js';

/** @type {import('../../../types/feedback.js').FeedbackUiState} */
let initial = { connected: false, availability: 'disabled', pending: 0, delivery: null, status: 'ready', message: '' };
let context = PubSub.registerCtx(/** @type {Record<string, unknown>} */ ({ ...initial }), FEEDBACK_CONTEXT);

/** @param {Partial<import('../../../types/feedback.js').FeedbackUiState>} values */
export function updateFeedbackContext(values) {
  withoutFeedback(() => context.multiPub({ ...values }));
}

/**
 * @param {import('../../../types/feedback.js').FeedbackDelivery} delivery
 * @param {number} pending
 */
export function displayFeedbackDelivery(delivery, pending) {
  let messages = {
    queued: 'Changes submitted locally. Waiting for conversation delivery.',
    accepted: 'Conversation delivery confirmed. External persistence is not confirmed.',
    rejected: 'Feedback was rejected. Changes remain local.',
    unknown: 'Delivery is uncertain. Reconcile before retrying.',
  };
  updateFeedbackContext({ pending, delivery, message: delivery.failure?.message ?? messages[delivery.state],
    status: delivery.state === 'queued' ? 'loading' : delivery.state === 'accepted' ? 'ready' : 'error' });
}
