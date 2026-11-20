import { SESSION_ID_PATTERN } from '../../sessions/constants.js';

/**
 * @param {Map<string, import('./explorer.js').DirectoryNode>} directories
 * @param {(path: string) => string} idForPath
 * @returns {import('../../../uilib/types/uilib-explorer.js').UiExplorerNode[]}
 */
export function sessionExplorerItems(directories, idForPath) {
  let root = directories.get('');
  let definitions = new Set((root?.entries || []).filter((entry) => entry.kind !== 'directory' && entry.name.endsWith('.html'))
    .map((entry) => entry.name.slice(0, -5)));
  /** @type {Map<string, import('../../../types/explorer.js').ProjectEntry[]>} */
  let sessions = new Map();
  for (let entry of root?.entries || []) {
    let sessionId = entry.name.split('.')[0];
    if (!definitions.has(sessionId) || !SESSION_ID_PATTERN.test(sessionId)) { continue; }
    let owned = sessions.get(sessionId) || [];
    owned.push(entry);
    sessions.set(sessionId, owned);
  }
  /** @type {import('../../../uilib/types/uilib-explorer.js').UiExplorerNode[]} */
  let items = [];
  /**
   * @param {import('../../../types/explorer.js').ProjectEntry} entry
   * @param {string} parentId
   */
  let append = (entry, parentId) => {
    let child = directories.get(entry.path);
    let branch = entry.kind === 'directory';
    let id = idForPath(entry.path);
    items.push({
      id,
      parentId,
      path: entry.path,
      label: entry.name,
      branch,
      loaded: !branch || !!child?.loaded,
      loading: !!child?.loading,
      more: child?.nextOffset !== undefined,
      disabled: entry.kind === 'unavailable',
      message: entry.error || child?.error || (child?.loaded && !child.entries.length ? 'This folder is empty.' : ''),
    });
    for (let nested of child?.entries || []) { append(nested, id); }
  };
  for (let [
    sessionId,
    entries,
  ] of [
    ...sessions,
  ].sort((left, right) => left[0].localeCompare(right[0], 'en'))) {
    let id = `session:${sessionId}`;
    items.push({
      id,
      label: sessionId,
      branch: true,
      loaded: true,
    });
    for (let entry of entries) { append(entry, id); }
  }
  return items;
}
