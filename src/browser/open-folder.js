import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { posix, win32 } from 'node:path';
import { promisify } from 'node:util';

let execute = promisify(execFile);

/**
 * @param {string} command
 * @param {string[]} args
 * @param {NodeJS.Platform} platform
 */
async function launchFolderCommand(command, args, platform) {
  if (platform === 'win32') {
    // Explorer hands off to the desktop and does not provide a reliable exit status.
    let child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      shell: false,
    });
    await once(child, 'spawn');
    child.unref();
    return;
  }
  await execute(command, args, {
    timeout: 5_000,
    windowsHide: true,
    shell: false,
  });
}

/**
 * @param {string} folder
 * @param {{ platform?: NodeJS.Platform, env?: NodeJS.ProcessEnv, launch?: (command: string, args: string[]) => Promise<unknown> }} [options]
 */
export async function openFolder(folder, options = {}) {
  let platform = options.platform ?? process.platform;
  let env = options.env ?? process.env;
  let paths = platform === 'win32' ? win32 : posix;
  if (!paths.isAbsolute(folder) || folder.includes('\0')) { throw new Error('An absolute folder path is required.'); }
  let commands = {
    darwin: 'open',
    win32: 'explorer.exe',
    linux: 'xdg-open',
  };
  let command = commands[/** @type {keyof typeof commands} */ (platform)];
  if (!command) { throw new Error('Opening folders is not supported on this operating system.'); }
  if (platform === 'linux' && !env.DISPLAY && !env.WAYLAND_DISPLAY) {
    throw new Error('Opening folders requires a desktop session on the Node host.');
  }
  let launch = options.launch ?? ((command, args) => launchFolderCommand(command, args, platform));
  await launch(command, [
    folder,
  ]);
}
