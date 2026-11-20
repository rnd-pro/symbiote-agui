import { parseHTML } from 'linkedom';

/** @param {string} html */
export function parseMarkup(html) {
  let {
    document,
  } = parseHTML('<!doctype html><html><body></body></html>');
  let template = document.createElement('template');
  template.innerHTML = html;
  return template;
}

/** @param {{ content: DocumentFragment }} template */
export function serializeMarkup(template) {
  return Array.from(template.content.childNodes).map((node) => node.toString()).join('');
}
