import { watchScrollbarHover } from './scrollbar-hover.js';

/** @type {WeakMap<Document, () => void>} */
let documents = new WeakMap();
const IDLE_DELAY_MS = 900;

/** @param {Document} root */
export function watchScrollbarActivity(root) {
  let existing = documents.get(root);
  if (existing) { return existing; }
  /** @type {Map<Element, number>} */
  let timers = new Map();
  /** @param {Event} event */
  let activate = (event) => {
    let node = /** @type {Node | null} */ (event.target);
    let target = node === root ? root.scrollingElement : node?.nodeType === 1 ? /** @type {Element} */ (node) : null;
    if (!target) { return; }
    if (!timers.has(target)) { target.setAttribute('data-agui-scrolling', ''); }
    clearTimeout(timers.get(target));
    timers.set(target, window.setTimeout(() => {
      target.removeAttribute('data-agui-scrolling');
      timers.delete(target);
    }, IDLE_DELAY_MS));
  };
  let controller = new AbortController();
  watchScrollbarHover(root, controller.signal);
  for (let name of [
    'scroll',
    'scrollend',
  ]) {
    root.addEventListener(name, activate, {
      capture: true,
      passive: true,
      signal: controller.signal,
    });
  }
  let stop = () => {
    controller.abort();
    for (let [
      target,
      timer,
    ] of timers) {
      clearTimeout(timer);
      target.removeAttribute('data-agui-scrolling');
    }
    timers.clear();
    documents.delete(root);
  };
  documents.set(root, stop);
  return stop;
}
