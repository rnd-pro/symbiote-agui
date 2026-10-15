import { once } from 'node:events';
import { SHUTDOWN_TIMEOUT_MS } from '../sessions/constants.js';
import { withTimeout } from '../shared/timeout.js';

/**
 * @param {import('puppeteer-core').Browser | undefined} browser
 * @param {import('puppeteer-core').Page | undefined} page
 * @param {boolean} managed
 */
export async function closeBrowser(browser, page, managed) {
  if (!browser) {
    return;
  }

  if (!managed) {
    try {
      if (browser.connected && page && !page.isClosed()) {
        await withTimeout(page.close(), SHUTDOWN_TIMEOUT_MS, 'Timed out closing the session tab.');
      }
    } finally {
      await browser.disconnect();
    }
    return;
  }

  let child = browser.process();

  try {
    await withTimeout(browser.close(), SHUTDOWN_TIMEOUT_MS, 'Timed out closing managed Chrome.');
  } catch (error) {
    if (!child || child.exitCode !== null || child.signalCode !== null) {
      if (browser.connected) {
        throw error;
      }
      return;
    }

    let exited = once(child, 'exit');
    child.kill('SIGKILL');
    await withTimeout(exited, SHUTDOWN_TIMEOUT_MS, 'Managed Chrome did not exit.');
  } finally {
    await browser.disconnect();
  }
}
