import { readFile } from 'node:fs/promises';

export default await readFile(new URL('./shell.html', import.meta.url), 'utf8');
