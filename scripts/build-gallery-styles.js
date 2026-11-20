import { readFile, readdir, writeFile } from 'node:fs/promises';
import { cssMin } from 'jsda-kit/node/cssMin.js';
import { compileUtilities } from '../src/markup/styles.js';

let assets = new URL('../src/page/gallery.assets/', import.meta.url);
let sections = new URL('sections/', assets);
let names = (await readdir(sections)).filter((name) => name.endsWith('.html')).sort();
let fragments = await Promise.all(names.map((name) => readFile(new URL(name, sections), 'utf8')));
await writeFile(new URL('sections.css', assets), cssMin(await compileUtilities(fragments)) + '\n');
