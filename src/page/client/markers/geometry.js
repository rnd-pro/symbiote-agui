/** @param {Element} element */
function style(element) {
  return element.ownerDocument.defaultView?.getComputedStyle(element);
}

/** @param {Element} element */
function bounds(element) {
  if (!element.isConnected || !element.getClientRects().length) { return; }
  let rect = element.getBoundingClientRect();
  let view = element.ownerDocument.defaultView;
  if (!view || !rect.width || !rect.height) { return; }
  let left = Math.max(0, rect.left);
  let top = Math.max(0, rect.top);
  let right = Math.min(view.innerWidth, rect.right);
  let bottom = Math.min(view.innerHeight, rect.bottom);
  for (let parent = element; parent; parent = /** @type {Element} */ (parent.parentElement)) {
    let css = style(parent);
    if (!css || css.visibility === 'hidden' || css.display === 'none' || Number(css.opacity) === 0) { return; }
    if (parent !== element) {
      let clip = parent.getBoundingClientRect();
      if (/auto|scroll|hidden|clip/.test(css.overflowX)) { left = Math.max(left, clip.left); right = Math.min(right, clip.right); }
      if (/auto|scroll|hidden|clip/.test(css.overflowY)) { top = Math.max(top, clip.top); bottom = Math.min(bottom, clip.bottom); }
    }
    if (parent.matches(':modal, :popover-open')) { break; }
  }
  if (right <= left || bottom <= top) { return; }
  return {
    rect,
    left,
    top,
    right,
    bottom,
  };
}

/**
 * @param {Element} element
 * @returns {number[]}
 */
function stacking(element) {
  let result = [];
  for (let parent = element; parent; parent = /** @type {Element} */ (parent.parentElement)) {
    if (parent.matches(':modal, :popover-open')) { result.unshift(1e9); break; }
    let css = style(parent);
    if (css && (css.zIndex !== 'auto' || css.transform !== 'none' || css.isolation === 'isolate')) { result.unshift(Number.parseInt(css.zIndex) || 0); }
  }
  return result;
}

export class MarkerGeometry {
  /** @type {Map<string, Element>} */
  targets = new Map();
  /** @type {{ id: string, element: Element, box: NonNullable<ReturnType<typeof bounds>>, stack: number[], index: number }[] | undefined} */
  entries;

  /** @param {HTMLElement} root */
  constructor(root) { this.root = root; }

  invalidate() { this.entries = undefined; }

  /**
   * @param {number} x
   * @param {number} y
   */
  hit(x, y) {
    // Inert mirrors are excluded from native hit-testing. Inspect clipped boxes
    // without temporarily enabling their controls or navigation.
    this.entries ??= Array.from(this.targets, ([
      id,
      element,
    ], index) => ({
      id,
      element,
      box: bounds(element),
      stack: stacking(element),
      index,
    })).filter((entry) => !!entry.box).map((entry) => ({
      ...entry,
      box: /** @type {NonNullable<ReturnType<typeof bounds>>} */ (entry.box),
    })).sort((a, b) => {
      for (let index = 0; index < Math.max(a.stack.length, b.stack.length); index += 1) {
        let difference = (b.stack[index] || 0) - (a.stack[index] || 0);
        if (difference) { return difference; }
      }
      return b.index - a.index;
    });
    return this.entries.find(({
      box,
    }) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom);
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  point(x, y) {
    let target = this.hit(x, y);
    if (!target) { return null; }
    return {
      anchor: target.id,
      x: Math.max(0, Math.min(1, (x - target.box.rect.left) / target.box.rect.width)),
      y: Math.max(0, Math.min(1, (y - target.box.rect.top) / target.box.rect.height)),
    };
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  screen(x, y) {
    let frame = this.root.ownerDocument.defaultView?.frameElement;
    if (frame) {
      let rect = frame.getBoundingClientRect();
      let view = this.root.ownerDocument.defaultView;
      return {
        x: rect.left + x * rect.width / (view?.innerWidth || rect.width),
        y: rect.top + y * rect.height / (view?.innerHeight || rect.height),
      };
    }
    return {
      x,
      y,
    };
  }

  /** @param {import('../../../../types/transport.js').AnnotationPoint} point */
  project(point) {
    let element = this.targets.get(point.anchor);
    let box = element && bounds(element);
    if (!box) { return; }
    let x = box.rect.left + point.x * box.rect.width;
    let y = box.rect.top + point.y * box.rect.height;
    if (x < box.left || x > box.right || y < box.top || y > box.bottom) { return; }
    return this.screen(x, y);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} dx
   * @param {number} dy
   */
  scroll(x, y, dx, dy) {
    let target = this.hit(x, y)?.element;
    for (let element = target; element; element = element.parentElement || undefined) {
      let css = style(element);
      if (!css || element === this.root.ownerDocument.scrollingElement) { continue; }
      let left = element.scrollLeft;
      let top = element.scrollTop;
      if (/auto|scroll/.test(css.overflowX)) { element.scrollLeft += dx; }
      if (/auto|scroll/.test(css.overflowY)) { element.scrollTop += dy; }
      if (left !== element.scrollLeft || top !== element.scrollTop) { this.invalidate(); return true; }
    }
    return false;
  }
}
