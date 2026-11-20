import { highlightSourcePreview } from './source-preview.js';
import { ALL_PROJECTS } from '../scope.js';
import { sessionExplorerItems } from './explorer-items.js';

export let EXPLORER_STATE = {
  explorerItems: [],
  explorerSelection: [],
  explorerExpanded: [],
  explorerRequest: null,
  explorerTexts: {
    empty: '',
    invalidRows: 'Explorer entries could not be displayed.',
    invalidState: 'Explorer state could not be displayed.',
    unavailable: 'This explorer entry is unavailable.',
    expand: 'Expand',
    collapse: 'Collapse',
    select: 'Preview',
    more: 'Load more entries',
    retry: 'Retry folder',
  },
  explorerBreadcrumbs: [],
  explorerDirectory: '/',
  explorerNavigation: '',
  explorerHidden: false,
  explorerDisabled: true,
  explorerFolderPath: '',
  explorerStatus: 'empty',
  explorerMessage: 'Select Project explorer to browse this project.',
  previewPath: '',
  previewText: '',
  previewMarkdown: '',
  previewSourceHidden: true,
  previewMarkdownHidden: true,
  previewStatus: 'empty',
  previewMessage: 'Select a file to preview it.',
  previewTexts: {
    loading: 'Rendering file...',
    empty: 'This Markdown file is empty.',
    loadFailed: 'The Markdown renderer could not load. Reload the manager to retry.',
    renderFailed: 'The file could not be rendered.',
    invalidValue: 'The preview must contain Markdown text.',
    inputTooLarge: 'The file exceeds the document size limit.',
    outputTooLarge: 'The rendered file exceeds the document size limit.',
  },
};

/**
 * @typedef {object} DirectoryNode
 * @property {string} path
 * @property {boolean} loaded
 * @property {boolean} loading
 * @property {import('../../../types/explorer.js').ProjectEntry[]} entries
 * @property {number | undefined} nextOffset
 * @property {string} error
 */

export class ProjectExplorer {
  /** @type {string | undefined} */
  projectId;
  /** @type {Map<string, DirectoryNode>} */
  directories = new Map();
  active = false;
  revision = 0;
  previewVersion = 0;
  directoryPath = '';
  selectedPath = '';
  /** @type {import('../../../uilib/types/uilib-explorer.js').UiExplorerNode[]} */
  items = [];
  /** @type {Map<string, string>} */
  nodeIds = new Map();

  /** @param {import('./index.js').SessionManager} owner */
  constructor(owner) {
    this.owner = owner;
    owner.sub('explorerNavigation', (path) => { void this.reveal(path === '/' ? '' : path); }, false);
    owner.sub('explorerSelection', (ids) => {
      let entry = this.items.find((item) => item.id === ids?.[0]);
      if (entry?.branch) {
        this.clearPreview();
        this.directoryPath = typeof entry.path === 'string' ? entry.path : '';
        this.render();
      } else if (entry && typeof entry.path === 'string') { void this.preview(entry.path); }
    }, false);
    owner.sub('explorerRequest', (request) => {
      let entry = this.items.find((item) => item.id === request?.id);
      if (entry?.branch && typeof entry.path === 'string') {
        void this.load(entry.path, request.action === 'more' ? this.directories.get(entry.path)?.nextOffset ?? 0 : 0);
      }
    }, false);
  }

  /** @param {string} projectId */
  setProject(projectId) {
    if (projectId === ALL_PROJECTS) { this.active = false; }
    if (this.projectId === projectId) { return; }
    this.projectId = projectId;
    this.reload();
  }

  /** @param {boolean} active */
  activate(active) {
    this.active = active;
    if (active && !this.directories.has('')) { this.reload(); }
  }

  /** @param {boolean} ready */
  connectionChanged(ready) {
    this.revision += 1;
    this.previewVersion += 1;
    if (ready && this.active) { this.reload(); }
    else {
      for (let node of this.directories.values()) {
        if (node.loading && !node.loaded) { node.error = 'Connection lost. Reconnect or refresh to retry.'; }
        node.loading = false;
      }
      if (this.owner.$.previewStatus === 'loading') {
        this.owner.$.previewStatus = 'error';
        this.owner.$.previewMessage = 'Connection lost. Select the file again after reconnecting.';
      }
      this.render();
    }
  }

  reload() {
    this.revision += 1;
    this.directories.clear();
    this.nodeIds.clear();
    this.owner.set$({
      explorerSelection: [],
      explorerExpanded: [],
      explorerRequest: null,
    });
    this.directoryPath = '';
    this.clearPreview();
    this.render();
    if (this.active && this.projectId && this.projectId !== ALL_PROJECTS && this.owner.connection?.ready) { return this.load(''); }
  }

  clearPreview() {
    this.previewVersion += 1;
    this.selectedPath = '';
    this.owner.set$({
      previewPath: '',
      previewText: '',
      previewMarkdown: '',
      previewSourceHidden: true,
      previewMarkdownHidden: true,
      previewStatus: 'empty',
      previewMessage: 'Select a file to preview it.',
    });
  }

  /** @param {number} revision */
  current(revision) {
    return revision === this.revision && !this.owner.disposed && this.owner.connection?.ready;
  }

  /**
   * @param {string} path
   * @param {number} [offset]
   */
  async load(path, offset = 0) {
    let connection = this.owner.connection;
    if (!connection?.ready || !this.projectId) { return; }
    let node = this.directories.get(path);
    if (!node) {
      node = {
        path,
        loaded: false,
        loading: false,
        entries: [],
        nextOffset: undefined,
        error: '',
      };
      this.directories.set(path, node);
    }
    if (node.loading) { return; }
    node.loading = true;
    node.error = '';
    let revision = this.revision;
    this.render();
    try {
      let entries = offset ? [
        ...node.entries,
      ] : [];
      let nextOffset = /** @type {number | undefined} */ (offset);
      do {
        let result = await connection.request('project entries', {
          projectId: this.projectId,
          path,
          offset: nextOffset,
          showHidden: !!this.owner.$.explorerHidden,
        });
        if (!this.current(revision)) { return; }
        if (!result.ok || !result.directory) { throw new Error(result.error?.message || 'The project directory could not load.'); }
        entries.push(...result.directory.entries);
        nextOffset = result.directory.nextOffset;
      } while (!path && nextOffset !== undefined);
      node.entries = entries;
      node.nextOffset = nextOffset;
      node.loaded = true;
    } catch (error) {
      if (this.current(revision)) { node.error = error instanceof Error ? error.message : String(error); }
    } finally {
      if (this.current(revision)) { node.loading = false; this.render(); }
    }
  }

  /** @param {string} path */
  async reveal(path) {
    this.directoryPath = path;
    this.clearPreview();
    let selected = this.items.find((item) => item.branch && item.path === path);
    this.owner.$.explorerSelection = selected ? [
      selected.id,
    ] : [];
    let node = this.directories.get(path);
    let expanded = new Set(/** @type {string[]} */ (this.owner.$.explorerExpanded));
    let sessionId = /^([^/]+)\.assets(?:\/|$)/.exec(path)?.[1];
    if (sessionId) { expanded.add(`session:${sessionId}`); }
    let parts = path ? path.split('/') : [];
    for (let index = 0; index < parts.length; index += 1) { expanded.add(this.entryId(parts.slice(0, index + 1).join('/'))); }
    this.owner.$.explorerExpanded = [
      ...expanded,
    ];
    if (!node?.loaded) { await this.load(path); }
    this.render();
  }

  /** @param {string} path */
  async preview(path) {
    let connection = this.owner.connection;
    if (!connection?.ready || !this.projectId) { return; }
    this.clearPreview();
    this.selectedPath = path;
    this.directoryPath = path.split('/').slice(0, -1).join('/');
    let version = this.previewVersion;
    let revision = this.revision;
    this.owner.set$({
      previewPath: path,
      previewStatus: 'loading',
      previewMessage: 'Loading file...',
    });
    this.render();
    try {
      let result = await connection.request('project preview', {
        projectId: this.projectId,
        path,
        showHidden: !!this.owner.$.explorerHidden,
      });
      if (!this.current(revision) || version !== this.previewVersion) { return; }
      if (!result.ok || !result.preview) { throw new Error(result.error?.message || 'The file could not load.'); }
      let preview = result.preview;
      this.owner.set$({
        previewText: preview.kind === 'text' ? preview.text || '' : '',
        previewMarkdown: preview.kind === 'markdown' ? preview.text || '' : '',
        previewSourceHidden: preview.kind !== 'text',
        previewMarkdownHidden: preview.kind !== 'markdown',
        previewStatus: preview.message ? 'empty' : 'ready',
        previewMessage: preview.message || '',
      });
      if (preview.kind === 'text') {
        let code = this.owner.querySelector('#explorer-preview pre code');
        if (code instanceof HTMLElement) {
          void highlightSourcePreview(code, preview.text || '', path, () => !!this.current(revision) && version === this.previewVersion);
        }
      }
    } catch (error) {
      if (this.current(revision) && version === this.previewVersion) {
        this.owner.$.previewStatus = 'error';
        this.owner.$.previewMessage = error instanceof Error ? error.message : String(error);
      }
    }
  }

  render() {
    let disabled = !this.owner.connection?.ready;
    let root = this.directories.get('');
    this.items = sessionExplorerItems(this.directories, (path) => this.entryId(path));
    let parts = this.directoryPath ? this.directoryPath.split('/') : [];
    this.owner.set$({
      explorerDisabled: disabled,
      explorerFolderPath: this.directoryPath || String(this.owner.$.projectPath),
      explorerDirectory: this.directoryPath || '/',
      explorerItems: this.items,
      explorerStatus: root?.error ? 'error' : root?.loading && !root.loaded ? 'loading' : root?.loaded && !this.items.length ? 'empty' : 'ready',
      explorerMessage: root?.error || (root?.loading ? 'Loading saved AGUIs...' : 'No saved AGUIs in this project.'),
      explorerBreadcrumbs: [
        {
          value: '/',
          label: String(this.owner.$.projectName),
          icon: 'folder_open',
        },
        ...parts.map((label, index) => ({
          value: parts.slice(0, index + 1).join('/'),
          label,
        })),
      ],
    });
  }

  /** @param {string} path */
  entryId(path) {
    let id = this.nodeIds.get(path);
    if (!id) {
      id = path.length <= 128 ? path : `path:${this.nodeIds.size}`;
      this.nodeIds.set(path, id);
    }
    return id;
  }
}
