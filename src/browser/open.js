import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

let execute = promisify(execFile);

/** @param {string} url */
export async function openPage(url) {
  let commands = {
    darwin: ['open', url],
    win32: ['rundll32.exe', 'url.dll,FileProtocolHandler', url],
    linux: ['xdg-open', url],
  };
  let command = commands[/** @type {keyof typeof commands} */ (process.platform)];
  if (!command) { throw new Error('Open the session URL in your browser.'); }
  let [executable, ...args] = command;
  await execute(executable, args, { timeout: 5_000, windowsHide: true });
}
