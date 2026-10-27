import { ANNOTATION_ANCHOR_ATTRIBUTE, ANNOTATION_LIMITS } from '../../../transport/constants.js';
import { TABLE_ITEM_TAGS } from '../uilib/widgets/table/constants.js';

export class SnapshotAnchors {
  prefix = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
  next = 0;
  /** @type {WeakMap<Element, string>} */
  ids = new WeakMap();
  /** @type {Map<string, Element>} */
  targets = new Map();

  /**
   * @param {HTMLElement} root
   * @param {HTMLElement} copy
   */
  stamp(root, copy) {
    this.targets.clear();
    let originals = [
      root,
      ...root.querySelectorAll('*'),
    ];
    let copies = [
      copy,
      ...copy.querySelectorAll('*'),
    ];
    originals.forEach((element, index) => {
      let target = copies[index];
      target.removeAttribute(ANNOTATION_ANCHOR_ATTRIBUTE);
      let map = element.closest('.agui-map-canvas');
      if (this.targets.size >= ANNOTATION_LIMITS.anchors || TABLE_ITEM_TAGS.includes(element.localName)
        || element.closest('agui-data-toolbar, script, template, iframe, object, embed, base, meta, link')
        || map && map !== element) { return; }
      let id = this.ids.get(element) || `a${this.prefix}_${++this.next}`;
      this.ids.set(element, id);
      this.targets.set(id, element);
      target.setAttribute(ANNOTATION_ANCHOR_ATTRIBUTE, id);
    });
  }

  /** @param {HTMLElement} copy */
  finish(copy) {
    let rootAnchor = copy.getAttribute(ANNOTATION_ANCHOR_ATTRIBUTE) || '';
    let anchors = [
      rootAnchor,
      ...Array.from(copy.querySelectorAll(`[${ANNOTATION_ANCHOR_ATTRIBUTE}]`), (element) => element.getAttribute(ANNOTATION_ANCHOR_ATTRIBUTE) || ''),
    ];
    let retained = new Set(anchors);
    for (let id of this.targets.keys()) {
      if (!retained.has(id)) { this.targets.delete(id); }
    }
    return {
      anchors,
      rootAnchor,
    };
  }
}

/**
 * @param {HTMLElement} root
 * @param {import('../../../../types/transport.js').MirrorSnapshot} snapshot
 */
export function mirroredAnchors(root, snapshot) {
  let allowed = new Set(snapshot.anchors);
  let targets = new Map();
  if (snapshot.rootAnchor && allowed.has(snapshot.rootAnchor)) { targets.set(snapshot.rootAnchor, root); }
  for (let element of root.querySelectorAll(`[${ANNOTATION_ANCHOR_ATTRIBUTE}]`)) {
    let id = element.getAttribute(ANNOTATION_ANCHOR_ATTRIBUTE);
    if (id && allowed.has(id)) { targets.set(id, element); }
  }
  return /** @type {Map<string, Element>} */ (targets);
}
