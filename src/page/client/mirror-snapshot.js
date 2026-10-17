import { CONTENT_ROOT_ID, STYLESHEET_ID } from '../../markup/constants.js';

/** @param {number} revision */
export function captureSnapshot(revision) {
  let root = document.getElementById(CONTENT_ROOT_ID);
  let stylesheet = document.getElementById(STYLESHEET_ID)?.getAttribute('href');
  if (!root || !stylesheet) { return; }
  let copy = /** @type {HTMLElement} */ (root.cloneNode(true));
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
  copy.querySelectorAll('script, iframe, object, embed, base, meta, link').forEach((element) => element.remove());
  for (let element of copy.querySelectorAll('*')) {
    for (let attribute of [...element.attributes]) {
      if (/^on/i.test(attribute.name) || ['autofocus', 'contenteditable'].includes(attribute.name)) {
        element.removeAttribute(attribute.name);
      }
    }
    if (element.matches('a, area')) { element.removeAttribute('href'); }
  }
  return { html: copy.innerHTML, revision, stylesheetUrl: stylesheet };
}
