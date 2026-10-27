import { CONTENT_ROOT_ID, STYLESHEET_ID } from '../../markup/constants.js';
import { mirrorOverlays, MIRROR_OVERLAY_STYLES } from './mirror-overlays.js';
import { TABLE_ITEM_TAGS } from './uilib/widgets/table/constants.js';
import { mirrorMaps } from './mirror-maps.js';

/**
 * @param {number} revision
 * @param {import('./markers/anchors.js').SnapshotAnchors} anchors
 */
export function captureSnapshot(revision, anchors) {
  let root = document.getElementById(CONTENT_ROOT_ID);
  let stylesheet = document.getElementById(STYLESHEET_ID)?.getAttribute('href');
  if (!root || !stylesheet) { return; }
  let copy = /** @type {HTMLElement} */ (root.cloneNode(true));
  anchors.stamp(root, copy);
  let originals = root.querySelectorAll('input, textarea, select');
  let copies = copy.querySelectorAll('input, textarea, select');
  originals.forEach((element, index) => {
    let target = copies[index];
    if (element instanceof HTMLInputElement && target instanceof HTMLInputElement) {
      if (['password', 'file', 'hidden'].includes(element.type)) { target.removeAttribute('value'); }
      else { target.setAttribute('value', element.value); }
      target.toggleAttribute('checked', element.checked);
    } else if (element instanceof HTMLTextAreaElement && target) {
      target.textContent = element.value;
    } else if (element instanceof HTMLSelectElement && target instanceof HTMLSelectElement) {
      [...target.options].forEach((option, position) => option.toggleAttribute('selected', element.options[position].selected));
    }
  });
  mirrorOverlays(root, copy);
  mirrorMaps(root, copy);
  // Itemize hosts are transparent in the live table. Unwrap them so reparsing
  // a snapshot preserves native table structure instead of foster-parenting.
  for (let element of copy.querySelectorAll(TABLE_ITEM_TAGS.join(','))) {
    element.replaceWith(...element.childNodes);
  }
  copy.querySelectorAll('script, iframe, object, embed, base, meta, link').forEach((element) => element.remove());
  for (let element of copy.querySelectorAll('*')) {
    for (let attribute of [...element.attributes]) {
      if (/^on/i.test(attribute.name) || ['autofocus', 'contenteditable'].includes(attribute.name)) {
        element.removeAttribute(attribute.name);
      }
    }
    if (element.matches('a, area')) { element.removeAttribute('href'); }
  }
  let rootStyles = document.adoptedStyleSheets.flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).join('\n') + MIRROR_OVERLAY_STYLES;
  return {
    html: copy.innerHTML,
    revision,
    stylesheetUrl: stylesheet,
    rootStyles,
    theme: document.body.dataset.theme ?? 'system',
    ...anchors.finish(copy),
  };
}
