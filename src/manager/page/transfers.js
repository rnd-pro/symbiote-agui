export let TRANSFER_STATE = {
  transferOpen: false,
  transferTitle: '',
  transferSource: '',
  transferDestination: '',
  transferSessionId: '',
  transferOptions: [],
  transferIncludeData: false,
  transferIncludeMetadata: false,
  transferMetadata: '',
  transferPolicy: '',
  transferDisabled: true,
  transferError: '',
  transferMessage: '',
  transferDestinationDisabled: true,
  transferIsRename: false,
  transferIdLabel: 'Destination session ID',
  transferProjectDisabled: true,
  transferHistoryOpen: false,
  transferHistoryRows: {},
  transferHistoryMessage: '',
  transferHistoryError: '',
  transferRecoveryNotice: '',
};

export class SessionTransfers {
  kind = /** @type {import('../../../types/transfer.js').TransferKind | 'rename'} */ ('copy');
  sourceId = '';
  /** @type {import('../../../types/transfer.js').TransferResult | undefined} */
  result;
  /** @type {import('../../../types/transfer.js').TransferResult[]} */
  history = [];
  refreshing = false;
  historyIssue = '';

  /** @param {import('./index.js').SessionManager} owner */
  constructor(owner) {
    this.owner = owner;
  }

  /**
   * @param {import('../../../types/transfer.js').TransferKind | 'rename'} kind
   * @param {string} sessionId
   */
  open(kind, sessionId) {
    let owner = this.owner;
    if (!owner.connection?.ready || owner.busy) { return; }
    let row = owner.snapshot?.sessions.find((entry) => entry.sessionId === sessionId);
    if (!row?.definition) { owner.$.notice = 'Save this AGUI before transferring it.'; return; }
    this.kind = kind;
    this.sourceId = sessionId;
    this.result = undefined;
    let listing = owner.projects?.listing;
    let destination = kind === 'rename' ? listing?.projects.find((entry) => entry.id === listing.currentProjectId)
      : listing?.projects.find((entry) => entry.available && entry.id !== listing.currentProjectId)
      || listing?.projects.find((entry) => entry.available);
    let titles = {
      copy: 'Copy to project',
      move: 'Move to project',
      rename: 'Rename session',
    };
    let policies = {
      copy: 'Copies the saved definition. Browser drafts are not included. The original keeps running with its current URL, tunnel, and feedback.',
      move: 'Requires a stopped source. The destination stays stopped. Excluded saved data and metadata are retained in a private recovery backup.',
      rename: 'Requires a stopped session. Changes its ID and saved filenames in this project, preserving the description, committed data, and private metadata. It stays stopped; existing links and code references are not rewritten.',
    };
    owner.set$({
      transferOpen: true,
      transferTitle: titles[kind],
      transferIsRename: kind === 'rename',
      transferIdLabel: kind === 'rename' ? 'New session ID' : 'Destination session ID',
      transferSource: `${owner.$.projectName} / ${sessionId}`,
      transferDestination: destination?.id || '',
      transferSessionId: kind === 'rename' ? sessionId : destination?.id === listing?.currentProjectId ? `${sessionId.slice(0, 59)}-copy` : sessionId,
      transferIncludeData: kind === 'rename',
      transferIncludeMetadata: kind === 'rename',
      transferMetadata: JSON.stringify(row.definition.metadata || {}, null, 2),
      transferPolicy: policies[kind],
      transferError: '',
      transferMessage: '',
    });
    this.render();
  }

  render() {
    let owner = this.owner;
    let disabled = !owner.connection?.ready || owner.busy || owner.navigating;
    owner.set$({
      transferDisabled: disabled || !this.sourceId,
      transferProjectDisabled: disabled || this.kind === 'rename',
      transferDestinationDisabled: disabled || this.result?.state !== 'complete' || this.result.recoveryRequired,
      transferOptions: (owner.projects?.listing?.projects || []).map((entry) => ({
        value: entry.id,
        label: entry.folder ? `${entry.name} - ${entry.folder}` : entry.name,
        disabled: !entry.available,
      })),
      transferHistoryRows: Object.fromEntries(this.history.map((entry) => [
        entry.id,
        {
          title: `${entry.kind}: ${entry.sessionId} to ${entry.destination.name} / ${entry.destinationSessionId}`,
          state: entry.state,
          receipt: entry.receiptPath,
          backup: entry.kind === 'move' ? `Source backup: ${entry.backupPath}` : '',
          error: entry.error || '',
          recoverDisabled: disabled || !entry.recoveryRequired,
          recover: () => { void this.recover(entry.id); },
        },
      ])),
      transferRecoveryNotice: this.history.some((entry) => entry.recoveryRequired) ? 'A transfer needs recovery. Open Transfers to review it.' : '',
    });
  }

  async submit() {
    let owner = this.owner;
    let connection = owner.connection;
    if (!connection?.ready || owner.busy || !this.sourceId) { return; }
    owner.busy = true;
    let epoch = owner.viewEpoch;
    owner.$.transferError = '';
    owner.$.transferMessage = 'Transferring saved files...';
    owner.renderRows();
    try {
      let operations = /** @type {const} */ ({
        copy: 'copy session',
        move: 'move session',
        rename: 'rename session',
      });
      let result = await connection.request(operations[this.kind], {
        sessionId: this.sourceId,
        destinationSessionId: String(owner.$.transferSessionId).trim(),
        ...(this.kind === 'rename' ? {} : {
          destinationProjectId: String(owner.$.transferDestination),
          includeData: owner.$.transferIncludeData === true,
          includeMetadata: owner.$.transferIncludeMetadata === true,
        }),
        confirm: true,
      });
      if (!owner.isCurrentView(epoch)) { return; }
      this.result = result.transfer;
      if (!result.ok || !result.transfer) { throw new Error(result.error?.message || 'The transfer failed. Review Transfers before retrying.'); }
      let receipt = result.transfer;
      let backup = receipt.kind === 'move' && (!receipt.includeData && receipt.sourceHashes.data || !receipt.includeMetadata && receipt.sourceHashes.metadata)
        ? ` Excluded saved artifacts remain at ${receipt.backupPath}.` : '';
      owner.$.transferMessage = `${receipt.kind === 'copy' ? 'Copied' : 'Moved'} to ${receipt.destination.name} / ${receipt.destinationSessionId}. Destination is stopped.${backup}`;
      if (this.kind === 'rename') {
        owner.$.noticeTone = 'info';
        owner.$.notice = `Renamed ${this.sourceId} to ${receipt.destinationSessionId}. Session is stopped.`;
        owner.$.transferOpen = false;
      }
      await owner.refresh();
      if (this.kind === 'rename' && owner.isCurrentView(epoch)) {
        owner.$.selection = [
          receipt.destinationSessionId,
        ];
      }
      owner.explorer?.reload();
    } catch (error) {
      if (owner.isCurrentView(epoch)) {
        owner.$.transferMessage = '';
        owner.$.transferError = error instanceof Error ? error.message : String(error);
      }
    } finally {
      owner.busy = false;
      if (!owner.disposed) { owner.renderRows(); await this.refreshHistory(); }
    }
  }

  showHistory() {
    this.owner.$.transferHistoryOpen = true;
    void this.refreshHistory();
  }

  async refreshHistory() {
    let owner = this.owner;
    if (!owner.connection?.ready || this.refreshing || owner.navigating) { return; }
    this.refreshing = true;
    let epoch = owner.viewEpoch;
    try {
      let result = await owner.connection.request('transfer history');
      if (!owner.isCurrentView(epoch)) { return; }
      if (!result.ok || !result.transfers) { throw new Error(result.error?.message || 'Transfer history could not load.'); }
      this.history = result.transfers;
      owner.$.transferHistoryError = this.historyIssue;
      owner.$.transferHistoryMessage = this.history.length ? 'Incomplete transfers can be rolled back explicitly. Changed files are never overwritten by recovery.' : 'No transfers in this project yet.';
      this.render();
    } catch (error) {
      if (owner.isCurrentView(epoch)) { owner.$.transferHistoryError = error instanceof Error ? error.message : String(error); }
    } finally { this.refreshing = false; }
  }

  /** @param {string} id */
  async recover(id) {
    let owner = this.owner;
    if (!owner.connection?.ready || owner.busy
      || !confirm('Recover this incomplete transfer? A partial transfer is rolled back: missing move sources are restored and unchanged destination files are removed. Changed files are preserved for reconciliation.')) { return; }
    owner.busy = true;
    this.historyIssue = '';
    let epoch = owner.viewEpoch;
    owner.renderRows();
    try {
      let result = await owner.connection.request('recover transfer', {
        transferId: id,
        confirm: true,
      });
      if (!owner.isCurrentView(epoch)) { return; }
      if (!result.ok) { throw new Error(result.error?.message || 'Recovery did not complete.'); }
      this.result = result.transfer;
      owner.$.transferHistoryError = '';
      await owner.refresh();
      owner.explorer?.reload();
    } catch (error) {
      if (owner.isCurrentView(epoch)) {
        this.historyIssue = error instanceof Error ? error.message : String(error);
        owner.$.transferHistoryError = this.historyIssue;
      }
    } finally {
      owner.busy = false;
      if (!owner.disposed) { owner.renderRows(); await this.refreshHistory(); }
    }
  }

  async openDestination() {
    if (!this.result || this.result.state !== 'complete' || this.result.recoveryRequired) { return; }
    await this.owner.projects?.refresh();
    await this.owner.projects?.run('switch project', this.result.destination.id);
  }
}
