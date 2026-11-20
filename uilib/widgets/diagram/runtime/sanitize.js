import DOMPurify from 'dompurify';
import { DIAGRAM_LIMITS } from '../constants.js';

/** @param {string} svg */
export function diagramFragment(svg) {
  if (new TextEncoder().encode(svg).byteLength > DIAGRAM_LIMITS.outputBytes) { throw new Error('outputTooLarge'); }
  let fragment = DOMPurify.sanitize(svg, {
    USE_PROFILES: {
      svg: true,
    },
    FORBID_TAGS: [
      'script',
      'style',
      'foreignobject',
      'image',
      'a',
      'animate',
      'animatemotion',
      'animatetransform',
      'set',
    ],
    FORBID_ATTR: [
      'xml:base',
      'target',
    ],
    ALLOW_DATA_ATTR: false,
    RETURN_DOM_FRAGMENT: true,
  });
  let elements = fragment.querySelectorAll('*');
  if (elements.length > DIAGRAM_LIMITS.nodes) { throw new Error('outputTooLarge'); }
  for (let element of elements) {
    let depth = 0;
    let parent = element.parentElement;
    while (parent) {
      if (++depth > DIAGRAM_LIMITS.depth) { throw new Error('outputTooLarge'); }
      parent = parent.parentElement;
    }
    for (let attribute of [...element.attributes]) {
      let name = attribute.name.toLowerCase();
      if (name === 'href' || name === 'xlink:href') {
        if (!/^#[\w:.-]+$/.test(attribute.value)) { element.removeAttribute(attribute.name); }
        continue;
      }
      // Preserve local marker/clip references, never CSS resource requests.
      let value = attribute.value.replace(/url\(\s*(['"]?)#[\w:.-]+\1\s*\)/gi, '');
      if (/url\s*\(|image(?:-set)?\s*\(|src\s*\(|expression\s*\(|[\\@]/i.test(value)) {
        element.removeAttribute(attribute.name);
      }
    }
  }
  if (fragment.children.length !== 1 || fragment.firstElementChild?.localName !== 'svg') {
    throw new Error('renderFailed');
  }
  return fragment;
}
