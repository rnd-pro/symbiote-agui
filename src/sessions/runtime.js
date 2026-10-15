import { join } from 'node:path';
import { connectBrowser } from '../browser/connection.js';
import { closeBrowser } from '../browser/cleanup.js';
import { applyMarkup, collectClassNames } from '../browser/markup.js';
import { CONTENT_ROOT_ID, STYLESHEET_ID, STYLESHEET_PATH, STYLESHEET_TIMEOUT_MS } from '../markup/constants.js';
import { getStyles, publishStyles } from '../markup/styles.js';
import { startPageServer } from '../server/page-server.js';
import { closeServer } from '../shared/server.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { errorMessage } from '../shared/system-error.js';
import { SESSION_STATE, STARTUP_TIMEOUT_MS } from './constants.js';
import { recordDirectory } from './store.js';

export class SessionRuntime {
  /** @type {import('puppeteer-core').Browser | undefined} */
  browser;
  /** @type {import('puppeteer-core').Page | undefined} */
  page;
  /** @type {import('node:http').Server | undefined} */
  server;
  /** @type {import('../../types/markup.js').StyleCompiler | undefined} */
  styles;
  updates = Promise.resolve();
  revision = 0;
  closing = false;

  /** @param {import('../../types/session.js').SessionRecord} record */
  constructor(record) {
    this.record = record;
  }

  /** @param {AbortSignal} signal */
  async start(signal) {
    let { server, url, styles } = await startPageServer();
    this.server = server;
    this.styles = styles;
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
    let ready = !this.closing && this.server?.listening && this.browser?.connected && this.page && !this.page.isClosed()
      && this.page.url().split('#')[0] === this.record.url;

    return ready
      ? { sessionId: this.record.sessionId, state: SESSION_STATE.READY, url: this.record.url, cdpUrl: this.record.cdpUrl }
      : { sessionId: this.record.sessionId, state: SESSION_STATE.DISCONNECTED };
  }

  /** @param {string} html */
  insert(html) {
    let update = this.updates.then(() => this.replaceMarkup(html));
    this.updates = update.then(() => {}, () => {});
    return update;
  }

  /** @param {string} html */
  async replaceMarkup(html) {
    if (this.status().state !== SESSION_STATE.READY || !this.page || !this.styles) {
      throw new CommandError('The session page is disconnected. Stop and start it before inserting markup.', ERROR_CODE.SESSION_DISCONNECTED, EXIT_CODE.RUNTIME_ERROR);
    }

    let previous = getStyles();

    try {
      let candidates = await this.page.evaluate(collectClassNames, html);
      publishStyles(this.styles.build(candidates));
      this.revision += 1;
      await this.page.evaluate(applyMarkup, {
        html,
        stylesheetUrl: new URL(`${STYLESHEET_PATH}?revision=${this.revision}`, this.record.url).href,
        pageUrl: this.record.url || '',
        contentRootId: CONTENT_ROOT_ID,
        stylesheetId: STYLESHEET_ID,
        stylesheetTimeout: STYLESHEET_TIMEOUT_MS,
      });
      return this.status();
    } catch (error) {
      publishStyles(previous);
      let code = this.status().state === SESSION_STATE.READY ? ERROR_CODE.INSERT_FAILED : ERROR_CODE.SESSION_DISCONNECTED;
      throw new CommandError(`Could not insert markup: ${errorMessage(error)}`, code, EXIT_CODE.RUNTIME_ERROR);
    }
  }

  async close() {
    this.closing = true;
    await this.updates;
    try {
      await closeBrowser(this.browser, this.page, this.record.browser.mode === 'managed');
    } finally {
      await closeServer(this.server);
    }
  }
}
