import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

let execute = promisify(execFile);
let cliPath = fileURLToPath(new URL('../../bin/symbiote-agui.js', import.meta.url));

/** @param {string[]} args */
export async function cli(...args) {
  let { stdout } = await execute(process.execPath, [cliPath, ...args], { timeout: 45_000 });
  return JSON.parse(stdout);
}

/**
 * @param {string} sessionId
 * @param {string} html
 */
export async function insertStdin(sessionId, html) {
  let stdout = await new Promise((resolve, reject) => {
    let child = execFile(process.execPath, [cliPath, 'insert', sessionId], { timeout: 45_000 }, (error, output) => {
      error ? reject(Object.assign(error, { stdout: output })) : resolve(output);
    });
    child.stdin?.end(html);
  });
  return JSON.parse(stdout);
}

/**
 * @param {unknown} error
 * @param {string} code
 */
export function hasCliError(error, code) {
  let failure = /** @type {Error & { stdout: string }} */ (error);
  return JSON.parse(failure.stdout).error.code === code;
}
