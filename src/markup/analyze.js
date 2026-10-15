import { parseHTML } from 'linkedom';
import { analyzeFragment } from './fragment.js';

/** @param {string} html */
export function analyzeMarkup(html) {
  let { document } = parseHTML('<!doctype html><html><body></body></html>');
  let template = document.createElement('template');
  template.innerHTML = html;
  return analyzeFragment(template.content);
}
