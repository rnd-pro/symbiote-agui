export let MARKDOWN_ELEMENTS = Object.freeze([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'hr',
  'strong',
  'em',
  'del',
  'blockquote',
  'ul',
  'ol',
  'li',
  'pre',
  'code',
  'a',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'input',
  'span',
  'div',
  'section',
  'article',
  'header',
  'footer',
  'aside',
  'details',
  'summary',
  'figure',
  'figcaption',
  'picture',
  'source',
  'img',
  'video',
  'audio',
  'track',
  'time',
  'dl',
  'dt',
  'dd',
  'kbd',
  'samp',
  'mark',
  'small',
  'sub',
  'sup',
]);
export let MARKDOWN_SAFE_ATTRIBUTES = Object.freeze([
  'id',
  'href',
  'title',
  'start',
  'align',
  'type',
  'disabled',
  'checked',
  'class',
  'lang',
  'dir',
  'role',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'open',
  'src',
  'srcset',
  'sizes',
  'width',
  'height',
  'alt',
  'loading',
  'decoding',
  'controls',
  'preload',
  'poster',
  'kind',
  'srclang',
  'label',
  'media',
  'datetime',
  'colspan',
  'rowspan',
  'scope',
]);

/**
 * @param {string} html
 * @param {boolean} [extensions]
 */
export function markdownPolicy(html, extensions = true) {
  // An inert document prevents custom-element constructors and resource loads
  // while discovering wrapper names. Only sanitized nodes enter the live page.
  let inert = document.implementation.createHTMLDocument('');
  let template = inert.createElement('template');
  template.innerHTML = html;
  let customTags = new Set();
  let unwrappedTags = new Set();
  let attributes = new Set(MARKDOWN_SAFE_ATTRIBUTES);
  for (let element of template.content.querySelectorAll('*')) {
    let name = element.localName;
    if (!/^[a-z][\w.-]*-[\w.-]+$/.test(name) || [
      'agui-markdown',
      'context-provider',
    ].includes(name)) { continue; }
    if (!extensions) { unwrappedTags.add(name); continue; }
    customTags.add(name);
    let component = customElements.get(name);
    let observed = /** @type {string[]} */ (component && Reflect.get(component, 'observedAttributes') || []);
    for (let attribute of observed) {
      if (!/^on/i.test(attribute) && ![
        'bind',
        'ctx',
        'use-template',
        'ref',
        'itemize',
        'srcdoc',
        'style',
        'is',
      ].includes(attribute)) { attributes.add(attribute); }
    }
  }
  return {
    elements: [
      ...MARKDOWN_ELEMENTS,
      ...customTags,
    ],
    attributes: Array.from(attributes),
    customTags,
    unwrappedTags,
  };
}

/**
 * @param {string} value
 * @param {string} [base]
 */
export function linkDestination(value, base) {
  try {
    let url = new URL(value, base);
    return [
      'https:',
      'http:',
      'mailto:',
    ].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

/**
 * @param {string} value
 * @param {string} base
 */
export function resourceDestination(value, base) {
  if (!value.trim()) { return; }
  let destination = linkDestination(value, base);
  return destination && /^https?:/.test(destination) ? destination : undefined;
}

/**
 * @param {string} value
 * @param {string} base
 */
export function resourceSourceSet(value, base) {
  let candidates = value.split(',');
  if (candidates.length > 16) { return; }
  let result = [];
  for (let candidate of candidates) {
    let parts = candidate.trim().split(/\s+/);
    let url = resourceDestination(parts[0], base);
    if (!url || parts.length > 2 || parts[1] && !/^(\d+w|\d+(\.\d+)?x)$/.test(parts[1])) { return; }
    result.push(parts[1] ? `${url} ${parts[1]}` : url);
  }
  return result.join(', ');
}
