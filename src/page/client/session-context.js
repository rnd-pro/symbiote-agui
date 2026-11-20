import { PubSub } from '@symbiotejs/symbiote';
import { SESSION_CONTEXT } from '../../transport/constants.js';
import { withoutFeedback } from './feedback-guard.js';

let context = PubSub.registerCtx(/** @type {Record<string, unknown>} */ ({
  connected: false,
  role: 'user',
  userConnected: false,
  information: null,
  informationState: 'idle',
  annotationAvailable: false,
  annotationDrawing: true,
}), SESSION_CONTEXT);

/** @param {Partial<import('../../../types/transport.js').SessionUiState>} values */
export function updateSessionContext(values) { withoutFeedback(() => context.multiPub(values)); }
