import puppeteer from 'puppeteer-core';
import { STARTUP_TIMEOUT_MS, CONTROL_TIMEOUT_MS, PROTOCOL_TIMEOUT_MS } from '../sessions/constants.js';
import { resolveBrowserOptions } from './options.js';

/**
 * @param {import('../../types/browser.js').BrowserOptions} options
 * @param {string} profileDirectory
 * @param {AbortSignal} signal
 * @returns {Promise<import('puppeteer-core').Browser>}
 */
export async function connectBrowser(options, profileDirectory, signal) {
  signal.throwIfAborted();

  if (options.mode === 'managed') {
    return puppeteer.launch({
      ...(options.executablePath ? { executablePath: options.executablePath } : { channel: options.channel }),
      headless: false,
      protocol: 'cdp',
      defaultViewport: null,
      userDataDir: profileDirectory,
      debuggingPort: 0,
      args: ['--remote-debugging-address=127.0.0.1'],
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false,
      timeout: STARTUP_TIMEOUT_MS,
      protocolTimeout: PROTOCOL_TIMEOUT_MS,
      signal,
    });
  }

  let endpoint = options.cdpUrl;

  if (endpoint.startsWith('http:')) {
    let response = await fetch(new URL('/json/version', endpoint), { signal, redirect: 'error' });
    let metadata = /** @type {import('../../types/browser.js').BrowserVersion} */ (await response.json());

    if (!response.ok || typeof metadata.webSocketDebuggerUrl !== 'string') {
      throw new Error('The supplied CDP URL did not return a browser WebSocket endpoint.');
    }

    endpoint = metadata.webSocketDebuggerUrl;
  }

  resolveBrowserOptions(undefined, endpoint);
  signal.throwIfAborted();
  let browser = await puppeteer.connect({
    browserWSEndpoint: endpoint,
    protocol: 'cdp',
    protocolTimeout: PROTOCOL_TIMEOUT_MS,
    defaultViewport: null,
    wsOptions: { keepAlive: true, keepAliveIntervalMs: CONTROL_TIMEOUT_MS },
  });

  if (signal.aborted) {
    await browser.disconnect();
    signal.throwIfAborted();
  }

  return browser;
}
