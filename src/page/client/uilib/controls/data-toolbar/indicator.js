/**
 * @param {import('../../../../../../types/data-toolbar.js').ToolbarIndicatorInput} input
 */
export function toolbarIndicator(input) {
  let local = input.submission?.result;
  let delivery = input.submission?.delivery;
  let external = input.submission?.external;
  if (input.issue || input.transfer?.failure || local?.state === 'rejected' || external?.state === 'failed') {
    return {
      state: 'error',
      icon: 'error',
      tone: 'danger',
      textKey: 'status.failed',
    };
  }
  if (input.stale || local?.state === 'unknown' || delivery?.state === 'unknown' || external?.state === 'unknown') {
    return {
      state: 'uncertain',
      icon: 'warning',
      tone: 'warning',
      textKey: input.stale ? 'stale' : 'status.uncertain',
    };
  }
  if (!input.connected) {
    return {
      state: 'disconnected',
      icon: 'warning',
      tone: 'warning',
      textKey: 'disconnected',
    };
  }
  if (input.viewer) {
    return {
      state: 'viewer',
      icon: 'visibility',
      tone: 'neutral',
      textKey: 'readonly',
    };
  }
  let saving = !!input.submission && (!local || local.state === 'queued');
  let transferring = input.transfer?.state === 'reading' || input.transfer?.state === 'picking' || input.transfer?.state === 'exporting';
  if (saving || transferring || delivery?.state === 'queued') {
    return {
      state: 'busy',
      icon: 'sync',
      tone: 'accent',
      textKey: saving ? 'saving' : transferring ? `transfer.${input.transfer?.state}` : 'delivery.queued',
    };
  }
  if (input.dirty) {
    return {
      state: 'dirty',
      icon: 'edit',
      tone: 'warning',
      textKey: 'dirty',
    };
  }
  if (delivery?.state === 'rejected') {
    return {
      state: 'delivery-unavailable',
      icon: 'warning',
      tone: 'warning',
      textKey: 'delivery.rejected',
    };
  }
  if (external?.state === 'verified') {
    return {
      state: 'verified',
      icon: 'check_circle',
      tone: 'success',
      textKey: 'external.verified',
    };
  }
  if (delivery?.state === 'accepted') {
    return {
      state: 'pending',
      icon: 'more_horiz',
      tone: 'accent',
      textKey: 'external.pending',
    };
  }
  return {
    state: local?.state === 'committed' ? 'saved' : 'clean',
    icon: local?.state === 'committed' ? 'check' : 'save',
    tone: local?.state === 'committed' ? 'accent' : 'neutral',
    textKey: local?.state === 'committed' ? 'saved' : 'clean',
  };
}
