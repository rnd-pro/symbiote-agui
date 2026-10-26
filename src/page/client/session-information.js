import { PAGE_REQUEST_TIMEOUT_MS } from '../../transport/constants.js';
import { updateSessionContext } from './session-context.js';

/** @type {(message: string) => boolean} */
let send = () => false;
let pending = '';
/** @type {number | undefined} */
let timer;

/** @param {(message: string) => boolean} sender */
export function setInformationSender(sender) { send = sender; }

export function failInformationRequest() {
  if (!pending) { return; }
  clearTimeout(timer);
  pending = '';
  updateSessionContext({
    informationState: 'failed',
  });
}

export function requestSessionInformation() {
  if (pending) { return; }
  pending = crypto.randomUUID();
  updateSessionContext({
    information: null,
    informationState: 'loading',
  });
  timer = window.setTimeout(failInformationRequest, PAGE_REQUEST_TIMEOUT_MS);
  if (!send(JSON.stringify({
    type: 'session-info-read',
    id: pending,
  }))) { failInformationRequest(); }
}

/** @param {import('../../../types/transport.js').SessionInformationServerMessage} message */
export function receiveSessionInformation(message) {
  if (!pending || message.id !== pending) { return; }
  clearTimeout(timer);
  pending = '';
  updateSessionContext({
    information: message.info,
    informationState: message.info ? 'ready' : 'failed',
  });
}
