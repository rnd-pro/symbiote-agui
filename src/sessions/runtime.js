import { join } from 'node:path';
import { connectBrowser } from '../browser/connection.js';
import { closeBrowser } from '../browser/cleanup.js';
import { startPageServer } from '../server/page-server.js';
import { closeServer } from '../shared/server.js';
import { SESSION_STATE, STARTUP_TIMEOUT_MS } from './constants.js';
import { recordDirectory } from './store.js';

export class SessionRuntime {
  /** @type {import('puppeteer-core').Browser | undefined} */
  browser;
  /** @type {import('puppeteer-core').Page | undefined} */
  page;
  /** @type {import('node:http').Server | undefined} */
  server;

  /** @param {import('../../types/session.js').SessionRecord} record */
  constructor(record) {
    this.record = record;
  }

  /** @param {AbortSignal} signal */
  async start(signal) {
    let { server, url } = await startPageServer();
    this.server = server;
    this.record.url = url;
    signal.throwIfAborted();
    this.browser = await connectBrowser(this.record.browser, join(recordDirectory(this.record), 'browser-profile'), signal);
    signal.throwIfAborted();
    this.page = await this.browser.newPage();
    signal.throwIfAborted();
    let response = await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: STARTUP_TIMEOUT_MS });

    if (!response?.ok()) {
      throw new Error('The session page failed to load.');
    }

    let cdp = await this.page.createCDPSession();

    try {
      let { targetInfo } = await cdp.send('Target.getTargetInfo');
      this.record.targetId = targetInfo.targetId;
    } finally {
      await cdp.detach();
    }

    this.record.cdpUrl = this.browser.wsEndpoint();
    this.record.browserPid = this.browser.process()?.pid;
    signal.throwIfAborted();
  }

  /** @returns {import('../../types/session.js').SessionStatus} */
  status() {
    let ready = this.server?.listening && this.browser?.connected && this.page && !this.page.isClosed();

    return ready
      ? { sessionId: this.record.sessionId, state: SESSION_STATE.READY, url: this.record.url, cdpUrl: this.record.cdpUrl }
      : { sessionId: this.record.sessionId, state: SESSION_STATE.DISCONNECTED };
  }

  async close() {
    try {
      await closeBrowser(this.browser, this.page, this.record.browser.mode === 'managed');
    } finally {
      await closeServer(this.server);
    }
  }
}
