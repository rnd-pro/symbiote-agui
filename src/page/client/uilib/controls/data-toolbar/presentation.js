import {
  getDataState,
} from '../../../data-context.js';
import { toolbarIndicator } from './indicator.js';
import { toolbarNotices } from './notices.js';

/** @param {import('./data-toolbar.js').DataToolbar} toolbar */
export function presentToolbar(toolbar) {
  let data = getDataState();
  let viewer = toolbar.$['AGUI_SESSION/role'] === 'viewer';
  let connected = toolbar.$['AGUI_SESSION/connected'] === true;
  let information = /** @type {import('../../../../../../types/transport.js').SessionInformation | null} */ (toolbar.$['AGUI_SESSION/information']);
  let informationState = toolbar.$['AGUI_SESSION/informationState'];
  let submission = toolbar.submission;
  let local = submission?.result;
  let delivery = submission?.delivery;
  let saving = !!submission && (!local || local.state === 'queued');
  let uncertain = local?.state === 'unknown';
  let importBusy = toolbar.transferState?.state === 'reading' || toolbar.transferState?.state === 'picking';
  let deliveryBusy = delivery?.state === 'queued';
  let text = (/** @type {string} */ key) => toolbar.text(key);
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
    indicatorLabel: [
      text('actions'),
      text(viewer ? 'viewer' : 'user'),
      text(connected ? 'connected' : 'disconnected'),
      indicatorMessage,
    ].filter(Boolean).join('. '),
    closeActionsLabel: text('closeActions'),
    descriptionLabel: text('description'),
    metadataLabel: text('metadata'),
    informationLabel: text(String(toolbar.$.informationKind)),
    closeInformationLabel: text('closeInformation'),
    descriptionHidden: toolbar.$.informationKind !== 'description',
    metadataHidden: toolbar.$.informationKind !== 'metadata',
    informationMessage: informationState === 'loading' ? text('informationLoading')
      : informationState === 'failed' ? text('informationFailed') : '',
    informationDisabled: viewer || !connected || informationState === 'loading',
    description: information?.description || (informationState === 'ready' ? text('description.empty') : ''),
    metadata: information ? JSON.stringify(information.metadata, null, 2) : '',
    descriptionTexts: Object.fromEntries(Object.entries(/** @type {import('../../../../../../types/uilib.js').UiTexts} */ (toolbar.$.texts) || {}).filter(([
      key,
    ]) => key.startsWith('description.')).map(([
      key,
      value,
    ]) => [
      key.slice('description.'.length),
      value,
    ])),
    actionsLabel: text('actions'),
    drawingLabel: text('drawing'),
    drawingHidden: !viewer || toolbar.$['AGUI_SESSION/annotationAvailable'] !== true,
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
    statusMessages: toolbarNotices({
      viewer,
      dirty: !!toolbar.$.dirty,
      stale: data.stale,
      issue: toolbar.issue,
      submission,
      transfer: toolbar.transferState,
    }, text),
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
