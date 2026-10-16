import { chmod, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * @param {string} directory
 * @param {string} [origin]
 */
export async function tunnelFixture(directory, origin = 'https://agui-test.trycloudflare.com') {
  let previous = process.env.AGUI_CLOUDFLARED_PATH;
  let mode = join(directory, 'tunnel-mode');
  let pids = join(directory, 'tunnel-pids');
  let executable = join(directory, 'fake-cloudflared');
  await writeFile(mode, 'ready');
  await writeFile(executable, `#!/usr/bin/env node
import { readFileSync, appendFileSync } from 'node:fs';
if (process.argv.includes('--logformat')) {
  console.error('Incorrect Usage. flag provided but not defined: -logformat');
  process.exit(0);
}
appendFileSync(${JSON.stringify(pids)}, process.pid + '\\n');
let mode = readFileSync(${JSON.stringify(mode)}, 'utf8');
if (mode === 'usage') {
  console.error('Incorrect Usage. Expected unsupported connector flag.');
  console.error('Help footer');
  process.exit(0);
}
if (mode === 'fail') {
  console.error('ERR Expected tunnel fixture failure');
  process.exit(2);
}
console.error(${JSON.stringify(origin)});
if (mode === 'ready') console.error('Registered tunnel connection');
setInterval(() => {}, 1000);
process.on('SIGTERM', () => process.exit(0));
`);
  await chmod(executable, 0o700);
  process.env.AGUI_CLOUDFLARED_PATH = executable;
  return {
    setMode: (/** @type {string} */ value) => writeFile(mode, value),
    async pids() {
      return (await readFile(pids, 'utf8')).trim().split('\n').map(Number);
    },
    close() {
      if (previous === undefined) { delete process.env.AGUI_CLOUDFLARED_PATH; }
      else { process.env.AGUI_CLOUDFLARED_PATH = previous; }
    },
  };
}
