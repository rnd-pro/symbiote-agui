import { getDataState } from '../../../data-context.js';

/** @param {import('./data-toolbar.js').DataToolbar} toolbar */
export function presentToolbar(toolbar) {
  let data = getDataState();
  let viewer = toolbar.$['AGUI_SESSION/role'] === 'viewer';
  let connected = toolbar.$['AGUI_SESSION/connected'] === true;
  let submission = toolbar.submission;
  let local = submission?.result;
  let delivery = submission?.delivery;
  let external = submission?.external;
  let saving = !!submission && (!local || local.state === 'queued');
  let uncertain = local?.state === 'unknown';
  let importBusy = toolbar.transferState?.state === 'reading' || toolbar.transferState?.state === 'picking';
  let deliveryBusy = delivery?.state === 'queued';
  let errors = [toolbar.issue, local?.failure?.message,
    delivery?.failure?.message, external?.state === 'failed' || external?.state === 'unknown' ? external.message : '',
    toolbar.transferState?.failure?.message].filter(Boolean);
  if (data.stale && !viewer) { errors.push('Saved data changed. Export needed edits and reconcile before saving.'); }
  toolbar.set$({
    roleLabel: viewer ? 'Viewer' : 'User', socketConnected: String(connected),
    connectionLabel: connected ? 'Connected' : 'Disconnected',
    editMessage: viewer ? 'Read-only' : toolbar.$.dirty ? 'Unsaved changes' : 'No unsaved changes',
    localMessage: saving ? 'Saving locally...' : local?.state === 'committed' ? 'Saved locally' : '',
    deliveryMessage: delivery ? ({ queued: 'Delivering to agent...', accepted: 'Agent delivery confirmed',
      rejected: 'Agent delivery unavailable', unknown: 'Agent delivery uncertain' })[delivery.state] : '',
    externalMessage: external ? ({ verified: 'External write verified', failed: 'External write failed', unknown: 'External write uncertain' })[external.state]
      : delivery?.state === 'accepted' ? 'External write pending verification' : '',
    transferMessage: toolbar.transferState?.failure ? '' : toolbar.transferState?.message ?? '',
    errorMessage: [...new Set(errors)].join(' '),
    saveDisabled: viewer || !toolbar.targets.length || !data.connected || data.stale || saving || uncertain || importBusy || deliveryBusy || !toolbar.$.dirty,
    cancelDisabled: viewer || saving || uncertain || importBusy || !toolbar.$.dirty,
    importDisabled: viewer || !toolbar.targets.length || saving || uncertain || importBusy,
    exportDisabled: viewer || !toolbar.targets.length,
    uncertain, checkDisabled: !data.connected || saving,
    saveHint: data.current?.dataFlow?.description || 'Save declared data locally, then request agent delivery when available.',
  });
  if (toolbar.transfer) {
    toolbar.transfer.options.exportTarget = data.current?.dataFlow?.targets.find((target) => ['json-file', 'manual'].includes(target.kind));
  }
}
