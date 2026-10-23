import { ContextProvider } from '../../page/client/context-provider.js';
import { registerUiLibComponents } from '../../page/client/uilib/index.js';
import { ManagerConnection } from './connection.js';
import { rowState } from './rows.js';
import { MANAGER_REFRESH_MS } from '../constants.js';
import { getTheme, setTheme, watchTheme } from './theme.js';
import { STATUS_OPTIONS, BULK_OPTIONS } from './options.js';
import { formatDataFlow } from '../../metadata/format.js';

class SessionManager extends ContextProvider {
  init$ = {
    connection: 'Connecting...',
    connectionTone: 'info',
    scope: '',
    checkedAt: 'Waiting for a snapshot',
    counts: '',
    empty: 'Loading sessions...',
    emptyStatus: 'loading',
    notice: '',
    noticeTone: 'info',
    rows: {
    },
    controlsDisabled: true,
    refreshDisabled: true,
    theme: getTheme(),
    statusOptions: STATUS_OPTIONS,
    bulkOptions: BULK_OPTIONS,
    query: '',
    statusFilter: 'all',
    bulkOperation: 'start',
    storageFolder: '',
    storageHint: 'Loading save-folder settings...',
    storageContext: '',
    storageDisabled: true,
    saveStorage: () => { void this.saveStorage(); },
    resetStorage: () => { void this.saveStorage(true); },
    refresh: () => { void this.refresh(); },
    bulk: () => {
      void this.act(/** @type {import('../../../types/manager.js').ManagerOperation} */ (this.$.bulkOperation));
    },
  };
  /** @type {import('../../../types/manager.js').ManagerSnapshot | undefined} */
  snapshot;
  busy = false;
  refreshing = false;
  refreshAgain = false;
  loaded = false;
  /** @type {ReturnType<typeof setInterval> | undefined} */
  interval;
  /** @type {ManagerConnection | undefined} */
  connection;
  /** @type {(() => void) | undefined} */
  stopThemeSync;

  renderCallback() {
    this.sub('theme', (theme) => setTheme(String(theme)));
    this.stopThemeSync = watchTheme((theme) => { this.$.theme = theme; });
    this.sub('query', () => this.renderRows(), false);
    this.sub('statusFilter', () => this.renderRows(), false);
    this.connection = new ManagerConnection((ready, message) => {
      this.$.connectionTone = ready ? 'info' : 'alert';
      this.$.connection = message;
      this.$.refreshDisabled = !ready;
      this.renderRows();
    }, () => { void this.refresh(); });
    this.connection.connect();
    this.interval = setInterval(() => {
      if (document.visibilityState === 'visible' && this.connection?.ready && !this.busy) { void this.refresh(); }
    }, MANAGER_REFRESH_MS);
  }

  async refresh() {
    if (!this.connection?.ready) { return; }
    if (this.refreshing) { this.refreshAgain = true; return; }
    this.refreshing = true;
    try {
      let result = await this.connection.request('snapshot');
      if (!result.ok || !result.snapshot) { throw new Error(result.error?.message || 'Session discovery failed.'); }
      this.snapshot = result.snapshot;
      if (!this.loaded) { this.$.storageFolder = result.snapshot.storage.folder || ''; }
      this.$.storageHint = result.snapshot.storage.message;
      this.$.storageContext = result.snapshot.storage.editable
        ? `Relative paths use ${result.snapshot.storage.projectDirectory}. Default cache: ${result.snapshot.storage.defaultFolder}.`
        : `Default cache: ${result.snapshot.storage.defaultFolder}.`;
      this.loaded = true;
      this.$.scope = result.snapshot.scope.settings.folder || `Private cache: ${result.snapshot.scope.stateRoot}`;
      this.$.checkedAt = `Updated ${new Date(result.snapshot.checkedAt).toLocaleTimeString()}`;
      this.renderRows();
    } catch (error) {
      this.$.noticeTone = 'alert';
      this.$.notice = String(error instanceof Error ? error.message : error);
      this.$.empty = 'Session discovery failed. Refresh to try again.';
      this.$.emptyStatus = 'error';
    } finally {
      this.refreshing = false;
      if (this.refreshAgain) { this.refreshAgain = false; void this.refresh(); }
    }
  }

  renderRows() {
    let sessions = this.snapshot?.sessions || [];
    let query = String(this.$.query).toLowerCase();
    let filter = this.$.statusFilter;
    let matches = sessions.filter((row) => `${row.sessionId} ${row.definition?.title || ''} ${row.definition?.description || ''} ${JSON.stringify(row.definition?.metadata ?? {})}`.toLowerCase().includes(query)
      && (filter === 'all' || (filter === 'running' && row.active === true) || (filter === 'stopped' && row.active === false) || (filter === 'unknown' && row.active === null)));
    let disabled = !this.connection?.ready || this.busy || !this.loaded;
    this.$.controlsDisabled = disabled;
    this.$.storageDisabled = disabled || !this.snapshot?.storage.editable;
    this.$.counts = `${sessions.length} total / ${sessions.filter((row) => row.active === true).length} running / ${sessions.filter((row) => row.active === false).length} stopped / ${sessions.filter((row) => row.active === null).length} unknown`;
    this.$.rows = Object.fromEntries(matches.map((row) => [row.sessionId, rowState(row, disabled, (operation, id) => { void this.act(operation, id); })]));
    this.$.emptyStatus = matches.length > 0 ? 'ready' : this.loaded ? 'empty' : 'loading';
    this.$.empty = this.loaded ? sessions.length ? 'No sessions match these filters.' : 'No sessions saved or running in this scope.' : 'Loading sessions...';
  }

  /**
   * @param {boolean} [reset]
   */
  async saveStorage(reset = false) {
    if (this.busy || !this.connection?.ready || !this.snapshot?.storage.editable) { return; }
    this.busy = true;
    this.$.noticeTone = 'info';
    this.$.notice = 'Saving the folder setting and opening its manager...';
    this.renderRows();
    try {
      let result = await this.connection.request('configure storage', {
        folder: reset ? null : String(this.$.storageFolder).trim() || null,
      });
      if (!result.ok || !result.manager?.url || !result.manager.launchUrl) {
        throw new Error(result.error?.message || 'The selected save folder could not open.');
      }
      this.$.notice = 'Save folder updated. Existing files and sessions remain in their original scope.';
      if (result.manager.url !== `${location.origin}${location.pathname}`) {
        location.assign(result.manager.launchUrl);
      } else {
        if (reset) { this.$.storageFolder = ''; }
        await this.refresh();
      }
    } catch (error) {
      this.$.noticeTone = 'alert';
      this.$.notice = error instanceof Error ? error.message : String(error);
    } finally {
      this.busy = false;
      this.renderRows();
    }
  }

  /**
   * @param {import('../../../types/manager.js').ManagerOperation} operation
   * @param {string} [sessionId]
   */
  async act(operation, sessionId) {
    if (this.busy || !this.connection?.ready) { return; }
    let target = sessionId || 'all sessions in this scope';
    let confirmations = {
      clear: `Clear ${target}? This deletes saved HTML and Markdown, including files in your Git library, and clears live content.`,
      sync: `Sync ${target}? Running interfaces reload their saved definition. Unsaved edits are discarded; committed data is retained.`,
      'tunnel renew': `Renew tunnels for ${target}? Current public links will be replaced.`,
    };
    let warning = confirmations[/** @type {keyof typeof confirmations} */ (operation)];
    if (warning && !confirm(warning)) { return; }
    this.busy = true;
    this.$.noticeTone = 'info';
    this.$.notice = `${operation}: working on ${target}...`;
    this.renderRows();
    try {
      let result = await this.connection.request(operation, { ...(sessionId ? { sessionId } : { all: true }), ...(warning ? { confirm: true } : {}) });
      if (result.description) {
        let dialog = /** @type {HTMLDialogElement} */ (this.ref.description);
        this.ref.descriptionText.textContent = [result.description.description || 'No description.',
          formatDataFlow(result.description.metadata?.dataFlow)].filter(Boolean).join('\n\n');
        dialog.showModal();
      }
      this.$.noticeTone = !result.ok || result.sessions?.some((row) => !row.ok) ? 'alert' : 'info';
      this.$.notice = (result.description ? `Description loaded for ${sessionId}.` : result.sessions?.map((row) => `${row.sessionId}: ${row.ok ? `${operation} completed` : row.error.message}`).join('\n'))
        || result.error?.message || 'No matching sessions for this operation.';
      await this.refresh();
    } catch (error) {
      this.$.noticeTone = 'alert';
      this.$.notice = error instanceof Error ? error.message : String(error);
    }
    finally { this.busy = false; this.renderRows(); }
  }

  destroyCallback() {
    this.stopThemeSync?.();
    clearInterval(this.interval);
    this.connection?.close();
  }
}
SessionManager.reg('agui-session-manager');
registerUiLibComponents();
