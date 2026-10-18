import { chmod, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * @param {string} directory
 * @param {string} [origin]
 */
export async function tunnelFixture(directory, origin = 'https://agui-test.trycloudflare.com') {
  let previous = process.env.AGUI_CLOUDFLARED_PATH;
  let previousOptions = process.env.NODE_OPTIONS;
  let mode = join(directory, 'tunnel-mode');
  let activity = join(directory, 'tunnel-activity');
  let hostname = join(directory, 'tunnel-origin');
  let fetchMock = join(directory, 'tunnel-fetch.mjs');
  let pids = join(directory, 'tunnel-pids');
  let executable = join(directory, 'fake-cloudflared');
  await writeFile(mode, 'ready');
  await writeFile(activity, 'ready');
  await writeFile(hostname, origin);
  await writeFile(fetchMock, `
import { readFileSync } from 'node:fs';
let original = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  let url = new URL(input instanceof Request ? input.url : input);
  if (url.hostname.endsWith('.trycloudflare.com') && url.pathname.endsWith('/tunnel-health')) {
    let mode = readFileSync(${JSON.stringify(activity)}, 'utf8');
    if (mode === 'network') throw new Error('Expected network failure');
    if (mode === 'disabled' || url.origin !== readFileSync(${JSON.stringify(hostname)}, 'utf8')) {
      return new Response('Tunnel disabled', { status: 503 });
    }
    return Response.json({
      sessionId: url.pathname.split('/')[1],
      nonce: mode === 'wrong' ? 'stale' : url.searchParams.get('nonce'),
    });
  }
  return original(input, options);
};
`);
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
console.error(readFileSync(${JSON.stringify(hostname)}, 'utf8'));
if (mode === 'ready') console.error('Registered tunnel connection');
if (mode === 'slow-ready') setTimeout(() => console.error('Registered tunnel connection'), 150);
setInterval(() => {}, 1000);
process.on('SIGTERM', () => process.exit(0));
`);
  await chmod(executable, 0o700);
  process.env.AGUI_CLOUDFLARED_PATH = executable;
  process.env.NODE_OPTIONS = `${previousOptions || ''} --import=${pathToFileURL(fetchMock).href}`.trim();
  return {
    setMode: (/** @type {string} */ value) => writeFile(mode, value),
    setActivity: (/** @type {string} */ value) => writeFile(activity, value),
    setOrigin: (/** @type {string} */ value) => writeFile(hostname, value),
    async pids() {
      return (await readFile(pids, 'utf8')).trim().split('\n').map(Number);
    },
    close() {
      if (previous === undefined) { delete process.env.AGUI_CLOUDFLARED_PATH; }
      else { process.env.AGUI_CLOUDFLARED_PATH = previous; }
      if (previousOptions === undefined) { delete process.env.NODE_OPTIONS; }
      else { process.env.NODE_OPTIONS = previousOptions; }
    },
  };
}
