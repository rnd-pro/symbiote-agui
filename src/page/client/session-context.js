import { PubSub } from '@symbiotejs/symbiote';
import { SESSION_CONTEXT } from '../../transport/constants.js';
import { withoutFeedback } from './feedback-guard.js';

let context = PubSub.registerCtx(/** @type {Record<string, unknown>} */ ({ connected: false, role: 'user', userConnected: false }), SESSION_CONTEXT);

/** @param {Partial<{ connected: boolean; role: import('../../../types/transport.js').PageRole; userConnected: boolean }>} values */
export function updateSessionContext(values) { withoutFeedback(() => context.multiPub(values)); }
