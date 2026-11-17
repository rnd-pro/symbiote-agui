import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { compile } from '@tailwindcss/node';
import { cssMin } from 'jsda-kit/node/cssMin.js';
import { analyzeMarkup } from '../src/markup/analyze.js';

let library = new URL('../src/uilib/', import.meta.url);
let sections = new URL('gallery.assets/sections/', library);
let names = (await readdir(sections)).filter((name) => name.endsWith('.html')).sort();
let fragments = await Promise.all(names.map((name) => readFile(new URL(name, sections), 'utf8')));
let classes = new Set(fragments.flatMap((html) => analyzeMarkup(html).classes));
let compiler = await compile('@reference "./theme.css";\n@layer utilities { @tailwind utilities; }', {
  base: fileURLToPath(library),
  onDependency() {},
});
await writeFile(new URL('gallery.assets/sections.css', library), cssMin(compiler.build([
  ...classes,
])) + '\n');
