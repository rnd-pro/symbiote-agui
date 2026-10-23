import { MARKDOWN_SANITIZER_PATH, MARKDOWN_LIMITS } from '../constants.js';
import { markdownPolicy, linkDestination, resourceDestination, resourceSourceSet } from './policy.js';

/** @type {Promise<typeof import('../sanitizer/index.js')> | undefined} */
let pending;

/**
 * @param {string} html
 * @param {string} headingPrefix
 * @param {string} baseUrl
 * @param {boolean} [extensions]
 */
export async function markdownFragment(html, headingPrefix, baseUrl, extensions = true) {
  let policy = markdownPolicy(html, extensions);
  let inert = document.implementation.createHTMLDocument('');
  let root = inert.createElement('div');
  if ('setHTML' in Element.prototype) {
    let setHTML = /** @type {(html: string, options: { sanitizer: SanitizerConfig }) => void} */ (Reflect.get(root, 'setHTML'));
    setHTML.call(root, html, {
      sanitizer: {
        elements: policy.elements,
        attributes: policy.attributes,
        replaceWithChildrenElements: [
          'agui-markdown',
          'context-provider',
          ...policy.unwrappedTags,
        ],
        comments: false,
      },
    });
  } else {
    let url = MARKDOWN_SANITIZER_PATH;
    pending ??= /** @type {Promise<typeof import('../sanitizer/index.js')>} */ (import(url));
    let fallback;
    try { fallback = await pending; } catch { throw new Error('loadFailed'); }
    root.append(fallback.sanitizeMarkdown(html, policy));
  }
  for (let element of root.querySelectorAll('pre code[class], pre code [class]')) {
    let code = element.matches('pre code');
    let token = element.localName === 'span' && !!element.closest('pre code');
    let classes = Array.from(element.classList).filter((name) => code
      ? name === 'hljs' || /^language-[\w+-]+$/.test(name)
      : token && /^(hljs-[\w-]+|[a-z][\w-]*_+)$/.test(name));
    element.removeAttribute('class');
    if (classes.length) { element.classList.add(...classes); }
  }
  let headings = new Map();
  for (let element of root.querySelectorAll('[id]')) {
    let id = element.id;
    element.removeAttribute('id');
    let base = id || 'section';
    let key = base;
    let suffix = 1;
    while (headings.has(key)) { key = `${base}-${++suffix}`; }
    element.id = `${headingPrefix}-${key}`;
    headings.set(key, element.id);
  }
  for (let link of root.querySelectorAll('a')) {
    let href = link.getAttribute('href');
    if (href === null || !href.trim()) { link.removeAttribute('href'); continue; }
    let destination = linkDestination(href, baseUrl);
    if (href.startsWith('#')) {
      let key;
      try { key = decodeURIComponent(href.slice(1)); } catch { key = ''; }
      let heading = headings.get(key);
      destination = heading ? `#${heading}` : undefined;
    }
    link.removeAttribute('href');
    if (!destination) { continue; }
    link.setAttribute('href', destination);
    if (/^https?:/.test(destination)) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  }
  for (let element of root.querySelectorAll('[aria-labelledby], [aria-describedby]')) {
    for (let name of [
      'aria-labelledby',
      'aria-describedby',
    ]) {
      let ids = element.getAttribute(name)?.split(/\s+/).map((id) => headings.get(id)).filter(Boolean);
      if (ids?.length) { element.setAttribute(name, ids.join(' ')); }
      else { element.removeAttribute(name); }
    }
  }
  for (let element of root.querySelectorAll('[src], [poster], [srcset]')) {
    for (let name of [
      'src',
      'poster',
      'srcset',
    ]) {
      if (!element.hasAttribute(name)) { continue; }
      let value = element.getAttribute(name) ?? '';
      let url = name === 'srcset' ? resourceSourceSet(value, baseUrl) : resourceDestination(value, baseUrl);
      element.removeAttribute(name);
      if (url) { element.setAttribute(name, url); }
    }
  }
  for (let input of root.querySelectorAll('input')) {
    input.type = 'checkbox';
    input.disabled = true;
    input.setAttribute('aria-label', input.closest('li')?.textContent?.trim() ?? '');
  }
  for (let table of root.querySelectorAll('table')) {
    let wrapper = document.createElement('div');
    wrapper.className = 'agui-markdown-table';
    table.replaceWith(wrapper);
    wrapper.append(table);
  }
  let nodes = document.createTreeWalker(root, NodeFilter.SHOW_ALL);
  let count = 0;
  while (nodes.nextNode()) {
    count += 1;
    let depth = 0;
    let parent = nodes.currentNode.parentNode;
    while (parent && parent !== root) { depth += 1; parent = parent.parentNode; }
    if (count > MARKDOWN_LIMITS.nodes || depth > MARKDOWN_LIMITS.depth) { throw new Error('outputTooLarge'); }
  }
  if (new TextEncoder().encode(root.innerHTML).byteLength > MARKDOWN_LIMITS.outputBytes) { throw new Error('outputTooLarge'); }
  let fragment = document.createDocumentFragment();
  for (let child of root.childNodes) { fragment.append(document.importNode(child, true)); }
  for (let element of fragment.querySelectorAll('*')) {
    // Registered implementations may enhance fallback content, but document
    // text is not a RAT template. Native component templates still process.
    if ('processInnerHtml' in element) { Reflect.set(element, 'processInnerHtml', false); }
  }
  return fragment;
}
