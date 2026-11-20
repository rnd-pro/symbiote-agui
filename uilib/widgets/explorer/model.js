import { DATA_LIMITS } from '../../shared/data/constants.js';
import { validateRows, validateIds } from '../../shared/data/validate.js';

/**
 * @param {import('../../types/uilib-explorer.js').UiExplorerNode[]} items
 * @param {string[]} expanded
 */
export function deriveExplorer(items, expanded) {
  validateRows(items, 'id');
  validateIds(expanded);
  let nodes = new Map(items.map((node) => [
    node.id,
    node,
  ]));
  /** @type {Map<string, import('../../types/uilib-explorer.js').UiExplorerNode[]>} */
  let children = new Map();
  for (let node of items) {
    if (typeof node.label !== 'string' || node.label.length > DATA_LIMITS.text
      || node.parentId !== undefined && typeof node.parentId !== 'string'
      || node.parentId && (!nodes.get(node.parentId)?.branch || node.parentId === node.id)
      || [
        'branch',
        'loaded',
        'loading',
        'more',
        'disabled',
      ].some((key) => node[key] !== undefined && typeof node[key] !== 'boolean')
      || [
        'icon',
        'message',
      ].some((key) => node[key] !== undefined && (typeof node[key] !== 'string' || node[key].length > DATA_LIMITS.text))) {
      throw new Error('invalidRows');
    }
    let parent = node.parentId || '';
    let siblings = children.get(parent) || [];
    siblings.push(node);
    children.set(parent, siblings);
  }
  let open = new Set(expanded);
  /** @type {(import('../../types/uilib-explorer.js').UiExplorerNode & { depth: number; visible: boolean; open: boolean })[]} */
  let rows = [];
  /**
   * @param {string} parent
   * @param {number} depth
   * @param {boolean} visible
   * @param {boolean} disabled
   */
  let visit = (parent, depth, visible, disabled) => {
    if (depth > 64) { throw new Error('invalidRows'); }
    for (let node of children.get(parent) || []) {
      let expanded = !!node.branch && open.has(node.id);
      rows.push({
        ...node,
        depth,
        visible,
        open: expanded,
        disabled: disabled || node.disabled,
      });
      visit(node.id, depth + 1, visible && expanded, disabled || !!node.disabled);
    }
  };
  visit('', 0, true, false);
  if (rows.length !== items.length) { throw new Error('invalidRows'); }
  return rows;
}
