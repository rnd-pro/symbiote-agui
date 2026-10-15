import { CommandError } from '../shared/command-error.js';

/**
 * @param {string | undefined} executablePath
 * @param {string | undefined} cdpUrl
 * @returns {import('../../types/browser.js').BrowserOptions}
 */
export function resolveBrowserOptions(executablePath, cdpUrl) {
  if (executablePath !== undefined && cdpUrl !== undefined) {
    throw new CommandError('--browser-path and --cdp-url are mutually exclusive.');
  }

  if (cdpUrl !== undefined) {
    let endpoint;

    try {
      endpoint = new URL(cdpUrl);
    } catch {
      throw new CommandError('--cdp-url must be a loopback HTTP or WebSocket URL.');
    }

    if (
      !['http:', 'ws:'].includes(endpoint.protocol)
      || !['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)
      || endpoint.username
      || endpoint.password
    ) {
      throw new CommandError('--cdp-url must be a loopback HTTP or WebSocket URL without credentials.');
    }

    return { mode: 'attached', cdpUrl: endpoint.href };
  }

  return executablePath === undefined
    ? { mode: 'managed', channel: 'chrome' }
    : { mode: 'managed', executablePath };
}
