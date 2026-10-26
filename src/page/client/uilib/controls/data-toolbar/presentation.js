import {
  getDataState,
} from '../../../data-context.js';
import { toolbarIndicator } from './indicator.js';

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
  let text = (/** @type {string} */ key) => toolbar.text(key);
  let errors = [
    toolbar.issue ? text(`issue.${toolbar.issue}`) : '',
    local?.failure ? text(`local.${local.failure.code}`) : '',
    delivery?.failure ? text(`feedback.${delivery.failure.code}`) : '',
    external?.state === 'failed' || external?.state === 'unknown' ? external.message : '',
    toolbar.transferState?.failure ? text(`transfer.${toolbar.transferState.failure.code}`) : '',
  ].filter(Boolean);
  if (data.stale && !viewer) { errors.push(text('stale')); }
  let indicator = toolbarIndicator({
    viewer,
    connected: connected && (viewer || data.connected),
    dirty: !!toolbar.$.dirty,
    stale: !viewer && data.stale,
    issue: !!toolbar.issue,
    submission,
    transfer: toolbar.transferState,
  });
  let indicatorMessage = text(indicator.textKey);
  toolbar.set$({
    indicatorState: indicator.state,
    indicatorIcon: indicator.icon,
    indicatorTone: indicator.tone,
    indicatorBusy: indicator.state === 'busy',
    indicatorMessage,
    indicatorLabel: [
      text('actions'),
      text(viewer ? 'viewer' : 'user'),
      text(connected ? 'connected' : 'disconnected'),
      indicatorMessage,
    ].filter(Boolean).join('. '),
    closeActionsLabel: text('closeActions'),
    actionsLabel: text('actions'),
    saveLabel: text('save'),
    cancelLabel: text('cancel'),
    importLabel: text('import'),
    exportLabel: text('export'),
    checkSaveLabel: text('checkSave'),
    fileLabel: text('importLabel'),
    closeLabel: text('closeMessage'),
    roleLabel: text(viewer ? 'viewer' : 'user'),
    socketConnected: String(connected),
    connectionTone: connected ? 'success' : 'warning',
    connectionLabel: text(connected ? 'connected' : 'disconnected'),
    editMessage: text(viewer ? 'readonly' : toolbar.$.dirty ? 'dirty' : 'clean'),
    localMessage: saving ? text('saving') : local?.state === 'committed' ? text('saved') : '',
    deliveryMessage: delivery ? text(`delivery.${delivery.state}`) : '',
    externalMessage: external ? text(`external.${external.state}`) : delivery?.state === 'accepted' ? text('external.pending') : '',
    transferMessage: toolbar.transferState && !toolbar.transferState.failure ? text(`transfer.${toolbar.transferState.state}`) : '',
    errorMessage: [...new Set(errors)].join(' '),
    saveDisabled: viewer || !toolbar.targets.length || !data.connected || data.stale || saving || uncertain || importBusy || deliveryBusy || !toolbar.$.dirty,
    cancelDisabled: viewer || saving || uncertain || importBusy || !toolbar.$.dirty,
    importDisabled: viewer || !toolbar.targets.length || saving || uncertain || importBusy,
    exportDisabled: viewer || !toolbar.targets.length,
    uncertain,
    checkDisabled: !data.connected || saving,
    saveHint: data.current?.dataFlow?.description || text('saveHint'),
  });
  if (toolbar.transfer) {
    toolbar.transfer.options.texts = /** @type {import('../../../../../../types/uilib.js').UiTexts | undefined} */ (toolbar.$.texts);
    toolbar.transfer.options.exportTarget = data.current?.dataFlow?.targets.find((target) => [
      'json-file',
      'manual',
    ].includes(target.kind));
  }
}
