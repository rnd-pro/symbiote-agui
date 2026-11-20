/**
 * @param {HTMLElement} target
 * @param {object} detail
 */
export function emitAction(target, detail) {
  return target.dispatchEvent(new CustomEvent('agui:action', {
    bubbles: true,
    composed: true,
    detail,
  }));
}
