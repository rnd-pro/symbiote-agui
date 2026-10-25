import { execFile } from 'node:child_process';
import { posix, win32 } from 'node:path';
import { promisify } from 'node:util';
import { hasErrorCode } from '../shared/system-error.js';

let execute = promisify(execFile);
let macScript = `try
  return POSIX path of (choose folder with prompt "Connect an AGUI project folder")
on error number -128
  return ""
end try`;
let windowsScript = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Windows.Forms
$picker = New-Object System.Windows.Forms.FolderBrowserDialog
$picker.Description = 'Connect an AGUI project folder'
$picker.ShowNewFolderButton = $false
try {
  if ($picker.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    [Console]::Write($picker.SelectedPath)
  }
} finally { $picker.Dispose() }
`;

/**
 * @param {{ platform?: NodeJS.Platform, env?: NodeJS.ProcessEnv, launch?: (command: string, args: string[]) => Promise<{ stdout: string }> }} [options]
 * @returns {Promise<string | undefined>}
 */
export async function pickFolder(options = {}) {
  let platform = options.platform ?? process.platform;
  let env = options.env ?? process.env;
  if (platform === 'linux' && !env.DISPLAY && !env.WAYLAND_DISPLAY) {
    throw new Error('Choosing a folder requires a desktop session on the Node host.');
  }
  let commands = {
    darwin: [
      {
        command: '/usr/bin/osascript',
        args: [
          '-e',
          macScript,
        ],
      },
    ],
    win32: [
      {
        command: 'powershell.exe',
        args: [
          '-NoProfile',
          '-NonInteractive',
          '-STA',
          '-Command',
          windowsScript,
        ],
      },
    ],
    linux: [
      {
        command: 'zenity',
        args: [
          '--file-selection',
          '--directory',
          '--title=Connect an AGUI project folder',
        ],
      },
      {
        command: 'kdialog',
        args: [
          '--getexistingdirectory',
          env.HOME || '/',
          '--title',
          'Connect an AGUI project folder',
        ],
      },
    ],
  };
  let candidates = commands[/** @type {keyof typeof commands} */ (platform)];
  if (!candidates) { throw new Error('Choosing folders is not supported on this operating system.'); }
  let launch = options.launch ?? ((command, args) => execute(command, args, {
    env,
    encoding: 'utf8',
    timeout: 90_000,
    maxBuffer: 64 * 1024,
    killSignal: 'SIGKILL',
    windowsHide: true,
    shell: false,
  }));
  for (let candidate of candidates) {
    try {
      let result = await launch(candidate.command, candidate.args);
      // Remove only the command's line ending, preserving spaces in the path.
      let folder = result.stdout.replace(/\r?\n$/, '');
      if (!folder) { return undefined; }
      let paths = platform === 'win32' ? win32 : posix;
      if (!paths.isAbsolute(folder) || folder.includes('\0') || folder.length > 4096) {
        throw new Error('The folder picker returned an invalid absolute path.');
      }
      return folder;
    } catch (error) {
      if (platform === 'linux' && hasErrorCode(error, 'ENOENT')) { continue; }
      let failure = /** @type {import('node:child_process').ExecFileException} */ (error);
      if (platform === 'linux' && failure.code === 1 && !failure.killed && !failure.signal && !failure.stderr?.trim()) {
        return undefined;
      }
      if (failure.killed) { throw new Error('Folder selection timed out.'); }
      throw error;
    }
  }
  throw new Error('No desktop folder picker is available. Linux requires Zenity or KDialog.');
}
