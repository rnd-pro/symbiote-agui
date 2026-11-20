import { parseMarkup } from './parse.js';
import { analyzeFragment } from './fragment.js';

/** @param {string} html */
export function analyzeMarkup(html) {
  return analyzeFragment(parseMarkup(html).content);
}
