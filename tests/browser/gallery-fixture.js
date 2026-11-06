import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';

export async function galleryExamples() {
  let html = await readFile(new URL('../../src/uilib/gallery.html', import.meta.url), 'utf8');
  let {
    document,
  } = parseHTML('');
  let template = document.createElement('template');
  template.innerHTML = html;
  let content = template.content;
  // Fixture extraction reads authored examples without instantiating conditionals.
  for (let nested = content.querySelector('template'); nested; nested = content.querySelector('template')) {
    nested.replaceWith(nested.content);
  }
  return content;
}
