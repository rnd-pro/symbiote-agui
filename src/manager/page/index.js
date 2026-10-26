import { ContextProvider } from '../../page/client/context-provider.js';
import { registerUiLibComponents } from '../../page/client/uilib/index.js';
import { CONNECTION_LOST_MESSAGE, ManagerConnection } from './connection.js';
import './rows.js';
import './controls.js';
import { rowState } from './session-state.js';
import { MANAGER_PATH, MANAGER_REFRESH_MS } from '../constants.js';
import { getTheme, setTheme, watchTheme } from './theme.js';
import { BULK_OPTIONS } from './options.js';
import { SESSION_COLUMNS, SESSION_FILTER_FIELDS, FILTER_TEXTS, TABLE_TEXTS, DESCRIPTION_TEXTS, sessionRecords } from './view.js';
import { formatDataFlow } from '../../metadata/format.js';
import { guardNativeRegistrations } from '../../page/client/native-webmcp.js';
import { PROJECT_STATE, ProjectNavigation } from './projects.js';
import { EXPLORER_STATE, ProjectExplorer } from './explorer.js';
import { TRANSFER_STATE, SessionTransfers } from './transfers.js';

guardNativeRegistrations(Reflect.get(document, 'modelContext') || Reflect.get(navigator, 'modelContext'));

export class SessionManager extends ContextProvider {
  init$ = {
    ...PROJECT_STATE,
    ...EXPLORER_STATE,
    ...TRANSFER_STATE,
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
    columns: SESSION_COLUMNS,
    filterFields: SESSION_FILTER_FIELDS,
    filterTexts: FILTER_TEXTS,
    tableTexts: TABLE_TEXTS,
    records: [],
    matchingIds: [],
    filters: {},
    selection: [],
    selectedRows: {},
    inspectorOpen: false,
    noSelection: true,
    loading: true,
    discoveryError: '',
    settingsOpen: false,
    descriptionOpen: false,
    description: '',
    descriptionTexts: DESCRIPTION_TEXTS,
    descriptionExtensions: false,
    explorerRefresh: () => this.explorer?.reload(),
    showTransfers: () => this.transfers?.showHistory(),
    submitTransfer: (/** @type {Event} */ event) => { event.preventDefault(); void this.transfers?.submit(); },
    openTransferDestination: () => { void this.transfers?.openDestination(); },
    openSettings: () => { this.$.settingsOpen = true; },
    openProjects: () => this.projects?.open(),
    switchProject: () => { void this.projects?.run('switch project', String(this.$.projectChoice)); },
    openProjectFolder: () => { void this.projects?.run('open folder', String(this.$.projectChoice)); },
    connectProject: (/** @type {Event} */ event) => {
      event.preventDefault();
      void this.projects?.run('connect project');
    },
    chooseProject: () => { void this.projects?.run('choose project'); },
    bulkOptions: BULK_OPTIONS,
    query: '',
    bulkOperation: 'start',
    storageFolder: '',
    storageHint: 'Loading save-folder settings...',
    storageContext: '',
    storageDisabled: true,
    saveStorage: () => { void this.saveStorage(); },
    resetStorage: () => { void this.saveStorage(true); },
    refresh: () => { void this.refresh(); if (this.$.workspaceView === 'explorer') { this.explorer?.reload(); } },
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
  disposed = false;
  navigating = false;
  viewEpoch = 0;
  /** @type {ProjectNavigation | undefined} */
  projects;
  /** @type {ProjectExplorer | undefined} */
  explorer;
  /** @type {SessionTransfers | undefined} */
  transfers;
  /** @type {ReturnType<typeof setInterval> | undefined} */
  interval;
  /** @type {ManagerConnection | undefined} */
  connection;
  /** @type {(() => void) | undefined} */
  stopThemeSync;

  renderCallback() {
    this.projects = new ProjectNavigation(this);
    this.explorer = new ProjectExplorer(this);
    this.transfers = new SessionTransfers(this);
    this.sub('workspaceView', (view) => this.explorer?.activate(view === 'explorer'));
    this.sub('explorerHidden', () => this.explorer?.reload(), false);
    this.sub('projectChoice', () => this.projects?.render(), false);
    this.sub('theme', (theme) => setTheme(String(theme)));
    this.stopThemeSync = watchTheme((theme) => { this.$.theme = theme; });
    this.sub('matchingIds', () => this.renderRows(), false);
    this.sub('selection', () => {
      this.renderRows();
      this.$.inspectorOpen = !this.$.noSelection;
    }, false);
    this.connection = new ManagerConnection((ready, message) => {
      if (this.disposed) { return; }
      if (!ready) {
        this.viewEpoch += 1;
        if (this.busy) {
          this.$.noticeTone = 'alert';
          this.$.notice = CONNECTION_LOST_MESSAGE;
        }
      }
      this.$.connectionTone = ready ? 'info' : 'alert';
      this.$.connection = message;
      this.$.refreshDisabled = !ready;
      this.explorer?.connectionChanged(ready);
      this.renderRows();
    }, () => { void this.projects?.refresh(); void this.refresh(); void this.transfers?.refreshHistory(); });
    this.connection.connect();
    this.interval = setInterval(() => {
      if (document.visibilityState === 'visible' && this.connection?.ready && !this.busy) { void this.refresh(); }
    }, MANAGER_REFRESH_MS);
  }

  async refresh() {
    if (!this.connection?.ready || this.navigating || this.disposed) { return; }
    if (this.refreshing) { this.refreshAgain = true; return; }
    this.refreshing = true;
    let epoch = this.viewEpoch;
    try {
      let result = await this.connection.request('snapshot');
      if (!this.isCurrentView(epoch)) { return; }
      if (!result.ok || !result.snapshot) { throw new Error(result.error?.message || 'Session discovery failed.'); }
      this.snapshot = result.snapshot;
      this.projects?.apply(result.snapshot.projects);
      let selection = /** @type {string[]} */ (this.$.selection);
      let retained = selection.filter((id) => result.snapshot?.sessions.some((row) => row.sessionId === id));
      if (retained.length !== selection.length) { this.$.selection = retained; }
      if (!this.loaded) { this.$.storageFolder = result.snapshot.storage.folder || ''; }
      this.$.storageHint = result.snapshot.storage.message;
      this.$.storageContext = result.snapshot.storage.editable
        ? `Relative paths use ${result.snapshot.storage.projectDirectory}. Default cache: ${result.snapshot.storage.defaultFolder}.`
        : `Default cache: ${result.snapshot.storage.defaultFolder}.`;
      this.$.discoveryError = '';
      this.loaded = true;
      this.$.records = sessionRecords(result.snapshot.sessions);
      this.$.loading = false;
      this.$.scope = result.snapshot.scope.settings.folder || `Private cache: ${result.snapshot.scope.stateRoot}`;
      this.$.checkedAt = `Updated ${new Date(result.snapshot.checkedAt).toLocaleTimeString()}`;
      this.renderRows();
    } catch (error) {
      if (!this.isCurrentView(epoch)) { return; }
      this.$.noticeTone = 'alert';
      this.$.notice = String(error instanceof Error ? error.message : error);
      this.$.discoveryError = 'Session discovery failed. Refresh to try again.';
      this.$.loading = false;
      this.renderRows();
      void this.projects?.refresh();
    } finally {
      this.refreshing = false;
      if (this.refreshAgain) { this.refreshAgain = false; void this.refresh(); }
    }
  }

  renderRows() {
    let sessions = this.snapshot?.sessions || [];
    let matchingIds = new Set(/** @type {string[]} */ (this.$.matchingIds));
    let matches = sessions.filter((row) => matchingIds.has(row.sessionId));
    let disabled = !this.connection?.ready || this.busy || !this.loaded;
    this.$.controlsDisabled = disabled;
    this.$.storageDisabled = disabled || !this.snapshot?.storage.editable;
    this.projects?.render();
    this.explorer?.render();
    this.transfers?.render();
    this.$.counts = `${sessions.length} total / ${sessions.filter((row) => row.active === true).length} running / ${sessions.filter((row) => row.active === false).length} stopped / ${sessions.filter((row) => row.active === null).length} unknown`;
    let states = Object.fromEntries(sessions.map((row) => [
      row.sessionId,
      rowState(row, disabled, (operation, id) => { void this.act(operation, id); }),
    ]));
    let selected = /** @type {string[]} */ (this.$.selection)[0];
    this.$.rows = Object.fromEntries(matches.map((row) => [
      row.sessionId,
      {
        card: {
          ...states[row.sessionId],
          selected: selected === row.sessionId,
        },
      },
    ]));
    this.$.noSelection = !selected || !states[selected];
    this.$.selectedRows = selected && states[selected] ? {
      [selected]: states[selected],
    } : {};
    this.$.emptyStatus = this.$.discoveryError ? 'error' : matches.length > 0 ? 'ready' : this.loaded ? 'empty' : 'loading';
    this.$.empty = this.$.discoveryError || (this.loaded ? sessions.length ? 'No sessions match these filters.' : 'No sessions saved or running in this scope.' : 'Loading sessions...');
  }

  /** @param {number} epoch */
  isCurrentView(epoch) {
    return !this.disposed && this.isConnected && epoch === this.viewEpoch;
  }

  /** @param {import('../../../types/manager.js').ManagerStatus} manager */
  navigate(manager) {
    let url = new URL(manager.url || '');
    let launch = new URL(manager.launchUrl || '');
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.pathname !== MANAGER_PATH
      || url.search || url.hash || launch.origin !== url.origin || launch.pathname !== url.pathname
      || launch.search || !/^#[a-f0-9]{64}$/.test(launch.hash)) { throw new Error('The manager returned an invalid project destination.'); }
    if (url.href === `${location.origin}${location.pathname}`) { return false; }
    this.navigating = true;
    this.viewEpoch += 1;
    this.$.selection = [];
    this.$.inspectorOpen = false;
    this.renderRows();
    try { location.assign(launch.href); }
    catch (error) { this.navigating = false; throw error; }
    return true;
  }

  /**
   * @param {boolean} [reset]
   */
  async saveStorage(reset = false) {
    if (this.busy || !this.connection?.ready || !this.snapshot?.storage.editable) { return; }
    this.busy = true;
    let epoch = ++this.viewEpoch;
    this.$.noticeTone = 'info';
    this.$.notice = 'Saving the folder setting and opening its manager...';
    this.renderRows();
    try {
      let result = await this.connection.request('configure storage', {
        folder: reset ? null : String(this.$.storageFolder).trim() || null,
      });
      if (!this.isCurrentView(epoch)) { return; }
      if (!result.ok || !result.manager?.url || !result.manager.launchUrl) {
        throw new Error(result.error?.message || 'The selected save folder could not open.');
      }
      this.$.notice = 'Save folder updated. Existing files and sessions remain in their original scope.';
      if (!this.navigate(result.manager)) {
        if (reset) { this.$.storageFolder = ''; }
        await this.refresh();
      }
    } catch (error) {
      if (!this.isCurrentView(epoch)) { return; }
      this.$.noticeTone = 'alert';
      this.$.notice = error instanceof Error ? error.message : String(error);
    } finally {
      if (!this.navigating) { this.busy = false; this.renderRows(); }
    }
  }

  /**
   * @param {import('../../../types/manager.js').ManagerOperation} operation
   * @param {string} [sessionId]
   */
  async act(operation, sessionId) {
    if (this.busy || !this.connection?.ready) { return; }
    let transferKinds = /** @type {const} */ ({
      'copy session': 'copy',
      'move session': 'move',
      'rename session': 'rename',
    });
    if (Object.hasOwn(transferKinds, operation)) {
      this.transfers?.open(transferKinds[/** @type {keyof typeof transferKinds} */ (operation)], sessionId || '');
      return;
    }
    let target = sessionId || 'all sessions in this scope';
    let confirmations = {
      clear: `Clear ${target}? This deletes saved HTML and Markdown, including files in your Git library, and clears live content.`,
      sync: `Sync ${target}? Running interfaces reload their saved definition. Unsaved edits are discarded; committed data is retained.`,
      'tunnel renew': `Renew tunnels for ${target}? Current public links will be replaced.`,
    };
    let warning = confirmations[/** @type {keyof typeof confirmations} */ (operation)];
    if (warning && !confirm(warning)) { return; }
    this.busy = true;
    let epoch = this.viewEpoch;
    this.$.noticeTone = 'info';
    this.$.notice = `${operation}: working on ${target}...`;
    this.renderRows();
    try {
      let result = await this.connection.request(operation, { ...(sessionId ? { sessionId } : { all: true }), ...(warning ? { confirm: true } : {}) });
      if (!this.isCurrentView(epoch)) { return; }
      if (result.description) {
        this.$.description = [result.description.description || 'No description.',
          formatDataFlow(result.description.metadata?.dataFlow)].filter(Boolean).join('\n\n');
        this.$.descriptionOpen = true;
      }
      this.$.noticeTone = !result.ok || result.sessions?.some((row) => !row.ok) ? 'alert' : 'info';
      this.$.notice = (result.description ? `Description loaded for ${sessionId}.` : result.sessions?.map((row) => `${row.sessionId}: ${row.ok ? `${operation} completed` : row.error.message}`).join('\n'))
        || result.error?.message || 'No matching sessions for this operation.';
      await this.refresh();
    } catch (error) {
      if (!this.isCurrentView(epoch)) { return; }
      this.$.noticeTone = 'alert';
      this.$.notice = error instanceof Error ? error.message : String(error);
    }
    finally { this.busy = false; this.renderRows(); }
  }

  destroyCallback() {
    this.disposed = true;
    this.viewEpoch += 1;
    this.stopThemeSync?.();
    clearInterval(this.interval);
    this.connection?.close();
  }
}
SessionManager.reg('agui-session-manager');
registerUiLibComponents();
