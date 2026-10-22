import { PubSub } from '@symbiotejs/symbiote';
import { JsonTransfer } from '../../src/page/client/uilib/controls/data-toolbar/transfer.js';
import { feedbackSuppressed } from '../../src/page/client/feedback-guard.js';

let targets = [{ provider: 'APP', keys: ['records', 'count'] }, { provider: 'OTHER', keys: ['enabled'] }];
let context = PubSub.registerCtx({ records: [{ name: 'Initial' }], count: 0, filter: 'keep' }, 'APP');
PubSub.registerCtx({ enabled: false }, 'OTHER');
/** @type {import('../../types/data.js').DataTransferState[]} */
let states = [];
/** @type {boolean[]} */
let suppressed = [];
context.sub('records', () => suppressed.push(feedbackSuppressed()), false);
let input = document.querySelector('input');
if (!(input instanceof HTMLInputElement)) { throw new Error('Missing file input.'); }
let transfer = new JsonTransfer({ input, targets: () => targets, report: (state) => {
  states.push(state);
  let output = document.querySelector('output');
  if (output) { output.textContent = state.message; }
}, exportTarget: { kind: 'json-file', reference: '../../draft.json', description: 'Manual draft backup.' } });
document.querySelector('#import')?.addEventListener('click', () => transfer.pickImport());
document.querySelector('#export')?.addEventListener('click', () => transfer.exportFile());
/** @type {string[]} */
let created = [];
/** @type {string[]} */
let revoked = [];
let create = URL.createObjectURL.bind(URL);
let revoke = URL.revokeObjectURL.bind(URL);
URL.createObjectURL = (blob) => { let url = create(blob); created.push(url); return url; };
URL.revokeObjectURL = (url) => { revoked.push(url); revoke(url); };
Reflect.set(window, 'transferTest', { transfer, context, states, suppressed, created, revoked, targets, PubSub });
