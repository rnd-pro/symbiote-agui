import { ContextProvider } from '../../page/client/context-provider.js';
import { registerUiLibComponents } from '../../page/client/uilib/index.js';
import { CONNECTION_LOST_MESSAGE, ManagerConnection } from './connection.js';
import './rows.js';
import './controls.js';
import { rowState } from './session-state.js';
import { MANAGER_REFRESH_MS } from '../constants.js';
import { getTheme, setTheme, watchTheme } from './theme.js';
import { BULK_OPTIONS } from './options.js';
import { SESSION_COLUMNS, SESSION_FILTER_FIELDS, FILTER_TEXTS, TABLE_TEXTS, DESCRIPTION_TEXTS, sessionRecords } from './view.js';
import { formatDataFlow } from '../../metadata/format.js';
import { guardNativeRegistrations } from '../../page/client/native-webmcp.js';
import { PROJECT_STATE, ProjectNavigation } from './projects.js';
import { EXPLORER_STATE, ProjectExplorer } from './explorer.js';
import { TRANSFER_STATE, SessionTransfers } from './transfers.js';
import { FEEDBACK_SETTINGS_STATE, SessionFeedbackSettings } from './feedback.js';
import { CONNECTIONS_STATE, LiveConnections } from './connections.js';

guardNativeRegistrations(Reflect.get(document, 'modelContext') || Reflect.get(navigator, 'modelContext'));

export class SessionManager extends ContextProvider {
  init$ = {
    ...PROJECT_STATE,
    ...EXPLORER_STATE,
    ...TRANSFER_STATE,
    ...FEEDBACK_SETTINGS_STATE,
    ...CONNECTIONS_STATE,
    refreshConnections: () => { void this.liveConnections?.refresh(); },
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
    saveFeedback: (/** @type {Event} */ event) => this.feedbackSettings?.submit(event),
    disableFeedback: (/** @type {Event} */ event) => this.feedbackSettings?.submit(event, true),
    refreshFeedback: () => { void this.feedbackSettings?.run('feedback settings'); },
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
  /** @type {LiveConnections | undefined} */
  liveConnections;
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
    this.liveConnections = new LiveConnections(this);
    this.feedbackSettings = new SessionFeedbackSettings(this);
    this.projects = new ProjectNavigation(this);
    this.explorer = new ProjectExplorer(this);
    this.transfers = new SessionTransfers(this);
    this.sub('workspaceView', (view) => {
      this.explorer?.activate(view === 'explorer');
      this.liveConnections?.activate(view === 'connections');
    });
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
      this.liveConnections?.connectionChanged(ready);
      this.renderRows();
    }, () => { void this.projects?.refresh(); void this.refresh(); void this.transfers?.refreshHistory(); });
    this.connection.connect();
    this.interval = setInterval(() => {
      if (document.visibilityState === 'visible' && this.connection?.ready && !this.busy) {
        void this.refresh();
        void this.liveConnections?.refresh();
      }
    }, MANAGER_REFRESH_MS);
  }

  async refresh() {
    if (!this.connection?.ready || this.disposed) { return; }
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
    this.feedbackSettings?.render();
    this.liveConnections?.render();
    this.$.counts = `${sessions.length} total / ${sessions.filter((row) => row.active === true).length} running / ${sessions.filter((row) => row.active === false).length} stopped / ${sessions.filter((row) => row.active === null).length} unknown`;
    let states = Object.fromEntries(sessions.map((row) => [
      row.sessionId,
      rowState(row, disabled, (operation, id) => { void this.act(operation, id); }, (viewer) => {
        void this.liveConnections?.open(row.sessionId, this.connection?.projectId || 'default', viewer, row.instanceId);
      }),
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

  /** @param {string} projectId */
  selectProject(projectId) {
    if (this.connection?.projectId === projectId) { return; }
    this.viewEpoch += 1;
    this.connection?.setProject(projectId);
    this.snapshot = undefined;
    this.loaded = false;
    this.set$({
      projectChoice: projectId,
      selection: [],
      matchingIds: [],
      records: [],
      rows: {},
      selectedRows: {},
      filters: {},
      query: '',
      inspectorOpen: false,
      noSelection: true,
      loading: true,
      discoveryError: '',
      descriptionOpen: false,
      feedbackOpen: false,
      transferOpen: false,
      transferHistoryOpen: false,
    });
    if (this.feedbackSettings) {
      this.feedbackSettings.settings = undefined;
      this.feedbackSettings.sessionId = '';
    }
    if (this.transfers) {
      this.transfers.history = [];
      this.transfers.result = undefined;
      this.transfers.sourceId = '';
    }
    this.explorer?.setProject(projectId);
    this.renderRows();
  }

  /**
   * @param {boolean} [reset]
   */
  async saveStorage(reset = false) {
    if (this.busy || !this.connection?.ready || !this.snapshot?.storage.editable) { return; }
    this.busy = true;
    let epoch = ++this.viewEpoch;
    this.$.noticeTone = 'info';
    this.$.notice = 'Saving the folder setting...';
    this.renderRows();
    try {
      let result = await this.connection.request('configure storage', {
        folder: reset ? null : String(this.$.storageFolder).trim() || null,
      });
      if (!this.isCurrentView(epoch)) { return; }
      if (!result.ok || !result.project || !result.projects) {
        throw new Error(result.error?.message || 'The selected save folder could not open.');
      }
      this.$.notice = 'Save folder updated. Existing files and sessions remain in their original scope.';
      this.selectProject(result.project.id);
      this.projects?.apply(result.projects);
      if (reset) { this.$.storageFolder = ''; }
      await this.refresh();
    } catch (error) {
      if (!this.isCurrentView(epoch)) { return; }
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
    if (operation === 'feedback settings') {
      this.feedbackSettings?.open(sessionId || '');
      return;
    }
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
