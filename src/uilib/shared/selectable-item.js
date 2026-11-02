/**
 * Bind whole-item selection without intercepting embedded controls or text selection.
 *
 * @param {HTMLElement} element
 * @param {() => boolean} enabled
 * @param {() => unknown} select
 */
export function bindItemSelection(element, enabled, select) {
  let click = (/** @type {MouseEvent} */ event) => {
    let target = event.target;
    if (event.defaultPrevented || !enabled() || !(target instanceof Element)
      || target.closest('a, button, input, select, textarea, label, summary, [contenteditable], [role="button"], [role="link"]')) { return; }
    let selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.containsNode(element, true)) { return; }
    select();
  };
  let keydown = (/** @type {KeyboardEvent} */ event) => {
    if (event.defaultPrevented || event.repeat || event.target !== element || !enabled()
      || event.key !== 'Enter' && event.key !== ' ') { return; }
    event.preventDefault();
    select();
  };
  element.addEventListener('click', click);
  element.addEventListener('keydown', keydown);
  return () => {
    element.removeEventListener('click', click);
    element.removeEventListener('keydown', keydown);
  };
}
