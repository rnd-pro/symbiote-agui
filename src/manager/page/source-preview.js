import { loadMarkdownRuntime } from '../../page/client/uilib/widgets/markdown/loader.js';

/**
 * @param {HTMLElement} code
 * @param {string} source
 * @param {() => boolean} current
 */
export async function highlightHtmlPreview(code, source, current) {
  try {
    // A fence longer than any source run keeps embedded Markdown inert too.
    let length = 3;
    for (let match of source.matchAll(/`+/g)) { length = Math.max(length, match[0].length + 1); }
    let fence = '`'.repeat(length);
    let runtime = await loadMarkdownRuntime();
    let fragment = await runtime.renderMarkdown(`${fence}html\n${source}\n${fence}`, 'explorer-source', document.baseURI, false);
    let highlighted = fragment.querySelector('pre code');
    if (!highlighted || !current()) { return; }
    // Marked adds a code-block newline. Keep the original source unchanged.
    if (highlighted.textContent === `${source}\n`) {
      let walker = document.createTreeWalker(highlighted, NodeFilter.SHOW_TEXT);
      let last;
      while (walker.nextNode()) { last = walker.currentNode; }
      if (last) { last.textContent = last.textContent?.slice(0, -1) || ''; }
    }
    if (highlighted.textContent !== source) { return; }
    code.replaceChildren(...highlighted.childNodes);
  } catch {
    // Source remains readable if loading fails or renderer bounds are exceeded.
  }
}
