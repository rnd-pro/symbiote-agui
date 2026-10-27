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
  let readyAge = join(directory, 'tunnel-ready-age');
  let readyAfter = join(directory, 'tunnel-ready-after');
  let fetchMock = join(directory, 'tunnel-fetch.mjs');
  let pids = join(directory, 'tunnel-pids');
  let executable = join(directory, 'fake-cloudflared');
  await writeFile(mode, 'ready');
  await writeFile(activity, 'ready');
  await writeFile(hostname, origin);
  await writeFile(readyAge, '0');
  await writeFile(readyAfter, '0');
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
    if (Date.now() < Number(readFileSync(${JSON.stringify(readyAfter)}, 'utf8'))) {
      throw new TypeError('fetch failed', { cause: new Error('getaddrinfo ENOTFOUND ' + url.hostname) });
    }
    return Response.json({
      sessionId: url.pathname.split('/')[1],
      nonce: mode === 'wrong' ? 'stale' : url.searchParams.get('nonce'),
    });
  }
  let response = await original(input, options);
  let age = Number(readFileSync(${JSON.stringify(readyAge)}, 'utf8'));
  if (age > 0 && url.hostname === '127.0.0.1' && url.pathname === '/status' && response.ok) {
    let reply = await response.json();
    if (reply.result?.tunnel?.readyAt) reply.result.tunnel.readyAt = new Date(Date.now() - age).toISOString();
    return Response.json(reply, { status: response.status });
  }
  return response;
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
    setReadyAge: (/** @type {number} */ value) => writeFile(readyAge, String(value)),
    delayActivity: (/** @type {number} */ milliseconds) => writeFile(readyAfter, String(Date.now() + milliseconds)),
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
