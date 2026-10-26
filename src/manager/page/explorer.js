import { highlightSourcePreview } from './source-preview.js';

export let EXPLORER_STATE = {
  workspaceView: 'table',
  explorerRows: {},
  explorerBreadcrumbs: {},
  explorerHidden: false,
  explorerDisabled: true,
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
 * @property {boolean} expanded
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

  /** @param {import('./index.js').SessionManager} owner */
  constructor(owner) {
    this.owner = owner;
  }

  /** @param {string} projectId */
  setProject(projectId) {
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
    this.directoryPath = '';
    this.clearPreview();
    this.render();
    if (this.active && this.projectId && this.owner.connection?.ready) { void this.load(''); }
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
        expanded: true,
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
      let result = await connection.request('project entries', {
        projectId: this.projectId,
        path,
        offset,
        showHidden: !!this.owner.$.explorerHidden,
      });
      if (!this.current(revision)) { return; }
      if (!result.ok || !result.directory) { throw new Error(result.error?.message || 'The project directory could not load.'); }
      node.entries = offset ? [
        ...node.entries,
        ...result.directory.entries,
      ] : result.directory.entries;
      node.nextOffset = result.directory.nextOffset;
      node.loaded = true;
    } catch (error) {
      if (this.current(revision)) { node.error = error instanceof Error ? error.message : String(error); }
    } finally {
      if (this.current(revision)) { node.loading = false; this.render(); }
    }
  }

  /** @param {string} path */
  toggle(path) {
    let node = this.directories.get(path);
    if (node?.expanded) { node.expanded = false; }
    else {
      if (node) { node.expanded = true; }
      this.directoryPath = path;
      if (!node?.loaded) { void this.load(path); }
    }
    this.render();
  }

  /** @param {string} path */
  reveal(path) {
    this.directoryPath = path;
    let node = this.directories.get(path);
    if (node) { node.expanded = true; }
    if (!node?.loaded) { void this.load(path); }
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
    /** @type {[string, object][]} */
    let rows = [];
    /**
     * @param {DirectoryNode} node
     * @param {number} depth
     */
    let append = (node, depth) => {
      for (let entry of node.entries) {
        let child = this.directories.get(entry.path);
        let folder = entry.kind === 'directory';
        rows.push([
          `entry:${entry.path}`,
          {
            path: entry.path,
            label: entry.name,
            actionLabel: `${folder ? child?.expanded ? 'Collapse' : 'Expand' : 'Preview'} ${entry.name}`,
            indent: `${depth}rem`,
            expanded: folder ? String(!!child?.expanded) : null,
            selected: entry.path === this.selectedPath ? 'true' : null,
            icon: folder ? child?.expanded ? 'expand_more' : 'chevron_right' : 'info',
            disabled: disabled || entry.kind === 'unavailable',
            issue: entry.error || '',
            invoke: () => { if (folder) { this.toggle(entry.path); } else { void this.preview(entry.path); } },
          },
        ]);
        if (child?.expanded) { append(child, depth + 1); }
      }
      let message = node.error || (node.loading ? 'Loading folder...' : !node.entries.length && node.path ? 'This folder is empty.' : '');
      if (message && node.path || node.nextOffset !== undefined) {
        rows.push([
          `status:${node.path}`,
          {
            path: '',
            label: message || 'Load more entries',
            actionLabel: message || 'Load more entries',
            indent: `${depth}rem`,
            expanded: null,
            selected: null,
            icon: node.error ? 'refresh' : 'more_horiz',
            disabled: disabled || node.loading || !node.error && node.nextOffset === undefined,
            issue: '',
            invoke: () => { void this.load(node.path, node.nextOffset ?? 0); },
          },
        ]);
      }
    };
    let root = this.directories.get('');
    if (root) { append(root, 0); }
    let parts = this.directoryPath ? this.directoryPath.split('/') : [];
    this.owner.set$({
      explorerDisabled: disabled,
      explorerRows: Object.fromEntries(rows),
      explorerStatus: root?.error ? 'error' : root?.loading && !root.loaded ? 'loading' : root?.loaded && !root.entries.length ? 'empty' : 'ready',
      explorerMessage: root?.error || (root?.loading ? 'Loading project files...' : 'This project folder is empty.'),
      explorerBreadcrumbs: Object.fromEntries([
        [
          'root',
          {
            label: String(this.owner.$.projectName),
            disabled,
            invoke: () => this.reveal(''),
          },
        ],
        ...parts.map((label, index) => [
          `part:${index}`,
          {
            label,
            disabled,
            invoke: () => this.reveal(parts.slice(0, index + 1).join('/')),
          },
        ]),
      ]),
    });
  }
}
