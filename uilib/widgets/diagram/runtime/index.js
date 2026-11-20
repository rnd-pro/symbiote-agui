import { diagramSvg } from './render.js';
import { diagramFragment } from './sanitize.js';

/**
 * @param {string} source
 * @param {string} idPrefix
 */
export async function renderDiagram(source, idPrefix) {
  return diagramFragment(diagramSvg(source, idPrefix));
}
