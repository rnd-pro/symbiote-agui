/**
 * @param {import('../../../../../../types/data-toolbar.js').ToolbarNoticesInput} input
 * @param {(key: string) => string} text
 * @returns {Record<string, import('../../../../../../types/data-toolbar.js').ToolbarNotice>}
 */
export function toolbarNotices(input, text) {
  /** @type {Record<string, import('../../../../../../types/data-toolbar.js').ToolbarNotice>} */
  let notices = {};
  /**
   * @param {string} key
   * @param {import('../../../../../../types/uilib.js').UiMessageTone} tone
   * @param {...(string | undefined)} parts
   */
  function add(key, tone, ...parts) {
    let message = [...new Set(parts.filter(Boolean))].join(' ');
    if (message) {
      notices[key] = {
        tone,
        message,
      };
    }
  }
  let local = input.submission?.result;
  let delivery = input.submission?.delivery;
  let external = input.submission?.external;
  let transfer = input.transfer;
  add('edit', !input.viewer && input.dirty ? 'warning' : 'info', text(input.viewer ? 'readonly' : input.dirty ? 'dirty' : 'clean'));
  if (input.submission) {
    let saving = !local || local.state === 'queued';
    /** @type {import('../../../../../../types/uilib.js').UiMessageTone} */
    let tone = saving ? 'info' : local?.state === 'committed' ? 'success' : local?.state === 'unknown' ? 'warning' : 'error';
    let key = saving ? 'saving' : local?.state === 'committed' ? 'saved' : local?.state === 'unknown' ? 'status.uncertain' : 'status.failed';
    add('local', tone, text(key), local?.failure ? text(`local.${local.failure.code}`) : '');
  }
  if (delivery) {
    let unavailable = !delivery.failure || [
      'DISABLED',
      'UNAVAILABLE',
      'DISCONNECTED',
      'AGENT_UPDATE',
      'USER_ACTION_REQUIRED',
    ].includes(delivery.failure.code);
    /** @type {import('../../../../../../types/uilib.js').UiMessageTone} */
    let tone = delivery.state === 'accepted' ? 'success' : delivery.state === 'queued' ? 'info'
      : delivery.state === 'rejected' && !unavailable ? 'error' : 'warning';
    add('delivery', tone,
      text(`delivery.${delivery.state}`), delivery.failure ? text(`feedback.${delivery.failure.code}`) : '');
  }
  if (external) {
    add('external', external.state === 'verified' ? 'success' : external.state === 'unknown' ? 'warning' : 'error',
      text(`external.${external.state}`), external.message);
  } else if (delivery?.state === 'accepted') { add('external', 'warning', text('external.pending')); }
  if (transfer) {
    let failed = transfer.state === 'error' || !!transfer.failure;
    add('transfer', failed ? 'error' : transfer.state === 'imported' ? 'warning' : 'info',
      text(transfer.failure ? `transfer.${transfer.failure.code}` : failed ? 'status.failed' : `transfer.${transfer.state}`));
  }
  if (input.issue) { add('issue', 'error', text(`issue.${input.issue}`)); }
  if (input.stale && !input.viewer) { add('stale', 'warning', text('stale')); }
  return notices;
}
