import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';

export async function galleryExamples() {
  let html = await readFile(new URL('../../src/uilib/gallery.html', import.meta.url), 'utf8');
  let {
    document,
  } = parseHTML('');
  let template = document.createElement('template');
  template.innerHTML = html;
  let content = template.content;
  let assets = new URL('../../src/uilib/gallery.assets/', import.meta.url);
  let groups = JSON.parse(await readFile(new URL('context.json', assets), 'utf8'));
  for (let nested = content.querySelector('template'); nested; nested = content.querySelector('template')) {
    nested.replaceWith(nested.content);
  }
  for (let owner of content.querySelectorAll('sym-context[bind^="$: GALLERY/"]')) {
    let group = owner.getAttribute('ctx')?.toLowerCase() || '';
    let script = owner.ownerDocument.createElement('script');
    script.type = 'application/json';
    script.textContent = JSON.stringify(groups[group]).replaceAll('<', '\\u003c');
    owner.removeAttribute('bind');
    owner.append(script);
  }
  let imported = content.querySelector('agui-viewport sym-import');
  if (!imported) { throw new Error('The gallery section configuration is missing.'); }
  let sections = document.createDocumentFragment();
  for (let option of Object.values(groups.router.routes)) {
    let source = /** @type {{src: string}} */ (option).src;
    let file = new URL(source.replace('./_assets/', ''), assets);
    let chunk = document.createElement('template');
    chunk.innerHTML = await readFile(file, 'utf8');
    for (let element of chunk.content.querySelectorAll('[src], [href]')) {
      for (let attribute of [
        'src',
        'href',
      ]) {
        let value = element.getAttribute(attribute);
        if (!value?.startsWith('../')) { continue; }
        let path = relative(fileURLToPath(assets), fileURLToPath(new URL(value, file)));
        element.setAttribute(attribute, `./_assets/${path.split('\\').join('/')}`);
      }
    }
    sections.append(chunk.content);
  }
  imported.replaceWith(sections);
  // Fixture extraction reads authored examples without instantiating conditionals.
  for (let nested = content.querySelector('template'); nested; nested = content.querySelector('template')) {
    nested.replaceWith(nested.content);
  }
  return content;
}

/** @param {DocumentFragment} examples */
export function galleryProviders(examples) {
  return [...examples.querySelectorAll('sym-context[ctx]')].flatMap((owner) => {
    let script = owner.querySelector(':scope > script[type="application/json"]');
    return script ? [
      `<sym-context ctx="${owner.getAttribute('ctx')}">${script.outerHTML}</sym-context>`,
    ] : [];
  }).join('\n');
}
