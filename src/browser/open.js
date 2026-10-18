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

/** @param {import('../../types/session.js').SessionStatus} status */
export async function openSessionPage(status) {
  let url = status.publicUserUrl || status.publicUrl || status.url;
  if (!url) { return status; }
  try {
    await openPage(url);
    return { ...status, opened: true };
  } catch {
    return { ...status, opened: false, warning: 'Could not open the default browser. Open publicUserUrl, publicUrl, or url manually.' };
  }
}
