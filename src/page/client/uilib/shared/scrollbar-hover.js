const OVERLAY_TRACK_WIDTH = 10;

/**
 * @param {HTMLElement} target
 * @param {PointerEvent} event
 * @param {Document} root
 */
function isScrollbarHit(target, event, root) {
  let vertical = target.scrollHeight > target.clientHeight;
  let horizontal = target.scrollWidth > target.clientWidth;
  if (!vertical && !horizontal) { return false; }
  let view = root.defaultView;
  if (!view) { return false; }
  let style = view.getComputedStyle(target);
  if (style.scrollbarWidth === 'none') { return false; }
  let viewport = target === root.scrollingElement;
  let bounds = target.getBoundingClientRect();
  let scaleX = viewport ? 1 : bounds.width / target.offsetWidth;
  let scaleY = viewport ? 1 : bounds.height / target.offsetHeight;
  let x = viewport ? event.clientX : (event.clientX - bounds.left) / scaleX;
  let y = viewport ? event.clientY : (event.clientY - bounds.top) / scaleY;
  let width = viewport ? view.innerWidth : target.offsetWidth;
  let height = viewport ? view.innerHeight : target.offsetHeight;
  let leftBorder = viewport ? 0 : parseFloat(style.borderLeftWidth);
  let rightBorder = viewport ? 0 : parseFloat(style.borderRightWidth);
  let topBorder = viewport ? 0 : parseFloat(style.borderTopWidth);
  let bottomBorder = viewport ? 0 : parseFloat(style.borderBottomWidth);
  if (x < leftBorder || x >= width - rightBorder || y < topBorder || y >= height - bottomBorder) { return false; }
  let gutterX = width - leftBorder - rightBorder - target.clientWidth;
  let gutterY = height - topBorder - bottomBorder - target.clientHeight;
  // Overlay scrollbars occupy no layout gutter; use the thin track's hit area.
  let trackX = gutterX || OVERLAY_TRACK_WIDTH;
  let trackY = gutterY || OVERLAY_TRACK_WIDTH;
  let leftTrack = target.clientLeft > leftBorder || (gutterX === 0 && style.direction === 'rtl');
  let verticalHit = leftTrack ? x < leftBorder + trackX : x >= width - rightBorder - trackX;
  return (vertical && (viewport || /^(auto|scroll|overlay)$/.test(style.overflowY)) && verticalHit)
    || (horizontal && (viewport || /^(auto|scroll|overlay)$/.test(style.overflowX)) && y >= height - bottomBorder - trackY);
}

/**
 * @param {Document} root
 * @param {AbortSignal} signal
 */
export function watchScrollbarHover(root, signal) {
  /** @type {Element | undefined} */
  let hovered;
  /** @param {Element | undefined} target */
  let update = (target) => {
    if (target === hovered) { return; }
    hovered?.removeAttribute('data-agui-scrollbar-hover');
    hovered = target;
    hovered?.setAttribute('data-agui-scrollbar-hover', '');
  };
  /** @param {PointerEvent} event */
  let move = (event) => {
    if (event.pointerType === 'touch') { return; }
    for (let node of event.composedPath()) {
      let candidate = node === root ? root.scrollingElement : node;
      if (!candidate || !('offsetWidth' in candidate)) { continue; }
      let target = /** @type {HTMLElement} */ (candidate);
      if (isScrollbarHit(target, event, root)) {
        update(target);
        return;
      }
    }
    update(undefined);
  };
  root.addEventListener('pointermove', move, {
    capture: true,
    passive: true,
    signal,
  });
  root.addEventListener('pointerout', (event) => {
    if (!event.relatedTarget) { update(undefined); }
  }, {
    capture: true,
    signal,
  });
  root.defaultView?.addEventListener('blur', () => update(undefined), {
    signal,
  });
  signal.addEventListener('abort', () => update(undefined), {
    once: true,
  });
}
