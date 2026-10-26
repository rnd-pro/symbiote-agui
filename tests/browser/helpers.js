import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

let execute = promisify(execFile);
let cliPath = fileURLToPath(new URL('../../bin/symbiote-agui.js', import.meta.url));

/**
 * @param {import('puppeteer-core').Page} page
 * @param {string} selector
 * @param {string} label
 */
export async function clickDataAction(page, selector, label) {
  let open = await page.$eval(`${selector} .agui-data-panel`, (element) => element.matches(':popover-open'));
  if (!open) { await page.locator(`${selector} .agui-data-trigger`).click(); }
  await page.locator(`${selector} .agui-data-actions ::-p-aria([name="${label}"][role="button"])`).click();
}

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
  return sendStdin('insert', sessionId, html);
}

/**
 * @param {'insert' | 'update' | 'call'} command
 * @param {string} sessionId
 * @param {string} input
 */
export async function sendStdin(command, sessionId, input) {
  let stdout = await new Promise((resolve, reject) => {
    let child = execFile(process.execPath, [cliPath, command, sessionId], { timeout: 45_000 }, (error, output) => {
      error ? reject(Object.assign(error, { stdout: output })) : resolve(output);
    });
    child.stdin?.end(input);
  });
  return JSON.parse(stdout);
}

/**
 * @param {keyof typeof import('../../src/mcp/catalog.js').MCP_TOOLS} name
 * @param {import('../../types/tools.js').McpToolArguments} args
 */
export async function cliToolCall(name, args) {
  try {
    let data = name === 'call_tool'
      ? await sendStdin('call', args.sessionId, JSON.stringify({
        pageId: args.pageId,
        discoveryId: args.discoveryId,
        name: args.name,
        input: args.input,
      }))
      : await cli(name === 'list_pages' ? 'pages' : 'tools', args.sessionId,
        ...(name === 'list_tools' && args.pageId ? ['--page', args.pageId] : []));
    return { data, isError: !data.ok };
  } catch (error) {
    let failure = /** @type {Error & { stdout: string }} */ (error);
    return { data: JSON.parse(failure.stdout), isError: true };
  }
}

/**
 * @param {string} sessionId
 * @param {'waiting' | 'ready' | 'stopped'} state
 */
export async function waitForSession(sessionId, state) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    let result = await cli('status', sessionId);
    if (result.state === state) { return result; }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Session ${sessionId} did not reach ${state}.`);
}

/**
 * @param {unknown} error
 * @param {string} code
 */
export function hasCliError(error, code) {
  let failure = /** @type {Error & { stdout: string }} */ (error);
  return JSON.parse(failure.stdout).error.code === code;
}
