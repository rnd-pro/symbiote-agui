import { parseHTML } from 'linkedom';
import { access } from 'node:fs/promises';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { getDefaultDefinitionFolder } from '../../library/paths.js';
import { CommandError } from '../../shared/command-error.js';

/**
 * @param {string} html
 * @param {string | undefined} folder
 */
export async function checkTransferDependencies(html, folder) {
  let {
    document,
  } = parseHTML('<html><body></body></html>');
  let template = document.createElement('template');
  template.innerHTML = html;
  let references = new Set();
  /** @param {DocumentFragment} fragment */
  let scan = (fragment) => {
    for (let element of fragment.querySelectorAll('*')) {
      for (let attribute of [
        'src',
        'href',
        'poster',
      ]) {
        let value = element.getAttribute(attribute)?.trim();
        if (value) { references.add(value); }
      }
      let sourceSet = element.getAttribute('srcset');
      if (sourceSet && !sourceSet.includes('data:')) {
        for (let value of sourceSet.split(',')) { references.add(value.trim().split(/\s+/)[0]); }
      }
      let styles = `${element.getAttribute('style') || ''}\n${element.localName === 'style' ? element.textContent || '' : ''}`;
      for (let match of styles.matchAll(/(?:url\(\s*|@import\s+)["']?([^\s"'()]+)["']?/g)) { references.add(match[1]); }
      if (element.localName === 'script' && element.getAttribute('type') === 'module') {
        for (let match of (element.textContent || '').matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["'](\.{1,2}\/[^"']+)["']/g)) { references.add(match[1]); }
      }
      if (element.localName === 'template') { scan(/** @type {HTMLTemplateElement} */ (element).content); }
    }
  };
  scan(template.content);
  let root = folder || getDefaultDefinitionFolder();
  let missing = [];
  for (let reference of references) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(reference)) { continue; }
    let path;
    try { path = resolve(root, decodeURIComponent(reference.split(/[?#]/)[0])); }
    catch { missing.push(reference); continue; }
    let child = relative(root, path);
    if (isAbsolute(child) || child === '..' || child.startsWith(`..${sep}`)) { missing.push(reference); continue; }
    try { await access(path); }
    catch { missing.push(reference); }
  }
  if (missing.length) { throw new CommandError(`Destination is missing project-relative dependencies: ${missing.slice(0, 20).join(', ')}. Supply those files or use portable URLs before transferring. No files were copied.`); }
}
