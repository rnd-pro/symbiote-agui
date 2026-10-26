import {
  UiComponent,
} from '../../shared/component.js';
import {
  dataTargets,
} from '../../../../../data/targets.js';
import {
  CONTENT_ROOT_ID,
} from '../../../../../markup/constants.js';
import {
  commitData,
  readDataCommit,
} from '../../../data.js';
import {
  getDataState,
} from '../../../data-context.js';
import {
  submitFeedback,
} from '../../../feedback.js';
import {
  feedbackSuppressed,
} from '../../../feedback-guard.js';
import {
  JsonTransfer,
} from './transfer.js';
import {
  captureDraft,
  replaceDraft,
} from './draft.js';
import {
  submissionTools,
} from './submission.js';
import {
  sameSubmission,
} from './saved-data.js';
import {
  presentToolbar,
} from './presentation.js';
import {
  DATA_TOOLBAR_TEMPLATE,
} from './template.js';
import {
  ToolbarMessages,
} from './messages.js';
import {
  MESSAGE_TIMEOUT_MS,
} from '../../feedback/message/constants.js';
import styles from './styles.js';
import { requestSessionInformation } from '../../../session-information.js';

let nextToolbarId = 0;

export class DataToolbar extends UiComponent {
  /** @type {import('../../../../../../types/data.js').DataTarget[]} */
  targets = [];
  /** @type {import('../../../../../../types/data.js').DataChange[]} */
  baseline = [];
  /** @type {string | undefined} */
  baselineRevision;
  /** @type {import('../../../../../../types/data-toolbar.js').ToolbarSubmission | undefined} */
  submission;
  /** @type {import('../../../../../../types/data.js').DataTransferState | undefined} */
  transferState;
  /** @type {JsonTransfer | undefined} */
  transfer;
  /** @type {ToolbarMessages | undefined} */
  messages;
  issue = '';
  disposed = false;
  init$ = {
    texts: undefined,
    externalResult: undefined,
    dirty: false,
    popupId: `agui-data-actions-${++nextToolbarId}`,
    indicatorState: 'clean',
    indicatorIcon: 'save',
    indicatorTone: 'neutral',
    indicatorLabel: '',
    indicatorBusy: false,
    closeActionsLabel: '',
    informationOpen: false,
    informationKind: 'description',
    informationLabel: '',
    closeInformationLabel: '',
    informationMessage: '',
    informationDisabled: true,
    descriptionLabel: '',
    metadataLabel: '',
    description: '',
    descriptionHidden: false,
    metadata: '',
    metadataHidden: true,
    descriptionTexts: {},
    descriptionExtensions: false,
    roleLabel: '',
    socketConnected: 'false',
    connectionLabel: '',
    connectionTone: 'warning',
    statusMessages: {},
    notifications: {},
    actionsLabel: '',
    saveLabel: '',
    cancelLabel: '',
    importLabel: '',
    exportLabel: '',
    checkSaveLabel: '',
    fileLabel: '',
    closeLabel: '',
    saveHint: '',
    messageTimeout: MESSAGE_TIMEOUT_MS,
    saveDisabled: true,
    cancelDisabled: true,
    importDisabled: true,
    exportDisabled: true,
    uncertain: false,
    checkDisabled: true,
    save: (/** @type {Event} */ event) => { void this.save(event); },
    cancel: () => this.cancel(),
    importJson: () => { if (!this.$.importDisabled) { this.transfer?.pickImport(); } },
    exportJson: () => { if (!this.$.exportDisabled) { this.transfer?.exportFile(); } },
    checkSave: () => { void this.checkSave(); },
    showDescription: () => this.showInformation('description'),
    showMetadata: () => this.showInformation('metadata'),
    ...submissionTools(this),
  };

  renderCallback() {
    this.messages = new ToolbarMessages(this);
    let root = document.getElementById(CONTENT_ROOT_ID);
    if (root && this.$['AGUI_SESSION/role'] !== 'viewer') {
      let declarations = dataTargets(root);
      let provider = this.getAttribute('provider');
      let keys = this.getAttribute('keys')?.trim().split(/\s+/);
      if (keys && !provider) { throw new Error('keys requires a provider attribute.'); }
      for (let [
        name,
        target,
      ] of declarations) {
        if (provider && provider !== name) { continue; }
        let selected = keys ?? target.keys;
        if (!selected.length || new Set(selected).size !== selected.length || selected.some((key) => !target.keys.includes(key))) { throw new Error('The toolbar can only target unique declared persist keys.'); }
        this.targets.push({
          provider: name,
          keys: selected,
        });
        this.baseline.push({
          provider: name,
          values: /** @type {import('../../../../../../types/data.js').DataChange['values']} */ (
            structuredClone(Object.fromEntries(selected.map((key) => [
              key,
              target.values[key],
            ])))
          ),
        });
      }
      if (provider && !this.targets.length) { throw new Error('The toolbar provider is not declared with persist.'); }
    }
    this.transfer = new JsonTransfer({
      input: this.ref.file,
      targets: () => this.targets,
      report: (state) => {
        this.transferState = state;
        this.refresh(true);
      },
    });
    this.sub('texts', () => this.refresh());
    for (let target of this.targets) {
      for (let key of target.keys) { this.sub(`${target.provider}/${key}`, () => this.refresh()); }
    }
    for (let property of [
      'AGUI_SESSION/role',
      'AGUI_SESSION/connected',
      'AGUI_SESSION/information',
      'AGUI_SESSION/informationState',
      'AGUI_DATA/current',
      'AGUI_DATA/connected',
      'AGUI_DATA/stale',
      'AGUI_DATA/baseRevision',
    ]) {
      this.sub(property, () => this.refresh());
    }
    this.sub('AGUI_DATA/result', (value) => {
      let result = /** @type {import('../../../../../../types/data.js').DataResult | null} */ (value);
      if (this.submission?.result?.state === 'unknown') { this.acceptLocalResult(result); }
    });
    this.sub('AGUI_FEEDBACK/delivery', (value) => {
      let delivery = /** @type {import('../../../../../../types/feedback.js').FeedbackDelivery | null} */ (value);
      let submitted = this.submission;
      if (submitted && delivery?.submissionId === submitted.reference.commitId
        && delivery.instanceId === submitted.reference.instanceId && delivery.revision === submitted.result?.revision) {
        submitted.delivery = delivery;
        this.refresh(true);
      }
    });
    this.sub('externalResult', (value) => {
      if (!value) { return; }
      try { this.acknowledge(/** @type {import('../../../../../../types/data-toolbar.js').ExternalAcknowledgement} */ (value)); }
      catch { this.issue = 'ackMismatch'; this.refresh(true); }
    });
    this.refresh();
  }

  /** @param {boolean} [notify] */
  refresh(notify = false) {
    if (this.disposed) { return; }
    this.baselineRevision ??= getDataState().baseRevision ?? undefined;
    try { this.$.dirty = this.targets.length > 0 && JSON.stringify(captureDraft(this.targets)) !== JSON.stringify(this.baseline); }
    catch { this.$.dirty = true; }
    presentToolbar(this);
    this.messages?.update(notify);
  }

  /** @param {string} key */
  text(key) {
    return String((/** @type {import('../../../../../../types/uilib.js').UiTexts | undefined} */ (this.$.texts))?.[key] ?? '');
  }

  /** @param {'description' | 'metadata'} kind */
  showInformation(kind) {
    if (this.$.informationDisabled) { return; }
    this.$.informationKind = kind;
    requestSessionInformation();
    this.refresh();
    this.$.informationOpen = true;
  }

  /** @param {Event} event */
  async save(event) {
    if (this.$.saveDisabled || feedbackSuppressed() || !event?.isTrusted || ![
      'click',
      'submit',
    ].includes(event.type)
      || Reflect.get(event, 'agentInvoked') === true) { return; }
    let formId = this.getAttribute('form');
    let form = formId ? document.getElementById(formId) : this.closest('form');
    if (form instanceof HTMLFormElement && !form.reportValidity()) { this.issue = 'formInvalid'; this.refresh(true); return; }
    let data = getDataState().current;
    if (!data) { return; }
    /** @type {import('../../../../../../types/data-toolbar.js').ToolbarSubmission} */
    let submitted;
    try {
      submitted = {
        reference: {
          commitId: crypto.randomUUID(),
          instanceId: data.instanceId,
          markupRevision: data.markupRevision,
        },
        changes: captureDraft(this.targets),
      };
    } catch { this.issue = 'draftInvalid'; this.refresh(true); return; }
    this.issue = '';
    this.submission = submitted;
    this.refresh(true);
    let result = await commitData(this.targets, {
      commitId: submitted.reference.commitId,
    });
    if (this.disposed || !this.isConnected || this.submission !== submitted) { return; }
    this.acceptLocalResult(result);
    if (result.state !== 'committed' || !result.revision) { return; }
    let bindings = this.targets.map(({
      provider,
      keys,
    }) => ({
      provider,
      keys,
    }));
    /** @type {Record<string, import('../../../../../../types/json.js').JsonValue>} */
    let details = {
      targetCount: bindings.length,
    };
    if (new TextEncoder().encode(JSON.stringify(bindings)).byteLength <= 4096) {
      details = {
        targets: bindings,
      };
    }
    let delivery = await submitFeedback({
      type: 'agui.data.submitted',
      source: (this.id || this.localName).slice(0, 128),
      data: {
        commit: {
          ...submitted.reference,
          revision: result.revision,
        },
        ...details,
      },
    }, {
      userEvent: event,
      submissionId: result.commitId,
      revision: result.revision,
    });
    if (!this.disposed && this.isConnected && this.submission === submitted) { submitted.delivery = delivery; this.refresh(true); }
  }

  /** @param {import('../../../../../../types/data.js').DataResult | null} result */
  acceptLocalResult(result) {
    let submitted = this.submission;
    if (!result || !submitted || !sameSubmission({
      ...submitted.reference,
      revision: '',
    }, {
      ...result,
      revision: '',
    })) { return; }
    submitted.result = result;
    if (result.state === 'committed') {
      this.baseline = structuredClone(submitted.changes);
      this.baselineRevision = result.revision;
    }
    this.refresh(true);
  }

  cancel() {
    if (this.$.cancelDisabled || feedbackSuppressed()) { return; }
    try {
      replaceDraft({
        version: 1,
        changes: this.baseline,
      }, this.targets);
      this.issue = '';
      this.transferState = undefined;
    } catch { this.issue = 'cancelFailed'; }
    this.refresh(true);
  }

  async checkSave() {
    if (this.$.checkDisabled || !this.submission) { return; }
    let result = await readDataCommit(this.submission.reference);
    if (!this.disposed) { this.acceptLocalResult(result); }
  }

  /** @param {import('../../../../../../types/data-toolbar.js').ExternalAcknowledgement} input */
  acknowledge(input) {
    let submitted = this.submission;
    if (!input || ![
      'verified',
      'failed',
      'unknown',
    ].includes(input.state) || (input.message !== undefined && (typeof input.message !== 'string' || input.message.length > 512))
      || !submitted?.result?.revision || !sameSubmission(input, {
        ...submitted.reference,
        revision: submitted.result.revision,
      })) {
      throw new Error('The external acknowledgement does not match the current submitted snapshot.');
    }
    submitted.external = structuredClone(input);
    this.refresh(true);
    return {
      acknowledged: true,
      ...input,
      dirty: this.$.dirty,
    };
  }

  destroyCallback() {
    this.disposed = true;
    this.messages?.dispose();
    this.transfer?.dispose();
  }
}

DataToolbar.template = DATA_TOOLBAR_TEMPLATE;
DataToolbar.rootStyles = styles;
DataToolbar.bindAttributes({
  'message-timeout': 'messageTimeout',
});
