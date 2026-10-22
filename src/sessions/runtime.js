import { analyzeMarkup } from '../markup/analyze.js';
import { STYLESHEET_PATH } from '../markup/constants.js';
import { getStyles, publishStyles } from '../markup/styles.js';
import { startPageServer } from '../server/page-server.js';
import { PageConnection } from '../server/page-connection.js';
import { closeServer } from '../shared/server.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { errorMessage } from '../shared/system-error.js';
import { validateStateUpdate } from '../transport/state-update.js';
import { SESSION_STATE } from './constants.js';
import { SessionEvents } from './events.js';
import { createPageAccess } from '../server/page-access.js';
import { handleToolRequest } from '../tools/service.js';
import { TOOL_OPERATION_TIMEOUT_MS, PAGE_ROLE } from '../transport/constants.js';
import { withTimeout } from '../shared/timeout.js';
import { readCachedMarkup, prepareCachedMarkup, clearCachedMarkup } from './cache.js';
import { SessionTunnel } from '../tunnel/session-tunnel.js';
import { recordDirectory } from './store.js';
import { SessionFeedback } from '../feedback/session-feedback.js';

export class SessionRuntime {
  /** @type {import('node:http').Server | undefined} */
  server;
  /** @type {PageConnection | undefined} */
  pages;
  /** @type {import('../../types/markup.js').StyleCompiler | undefined} */
  styles;
  /** @type {import('../../types/session.js').PageAccess | undefined} */
  access;
  /** @type {SessionTunnel | undefined} */
  tunnel;
  /** @type {import('../../types/transport.js').RenderUpdate | undefined} */
  latest;
  updates = Promise.resolve();
  tunnelOperations = Promise.resolve();
  /** @type {Promise<import('../../types/session.js').SessionStatus> | undefined} */
  tunnelRenewal;
  events = new SessionEvents();
  revision = 0;
  closing = false;
  restored = false;
  clearing = 0;

  /** @param {import('../../types/session.js').SessionRecord} record */
  constructor(record) {
    this.record = record;
    this.feedback = new SessionFeedback(record);
  }

  /** @param {AbortSignal} signal */
  async start(signal) {
    let cached = await readCachedMarkup(this.record.sessionId);
    let html = cached ?? '<h1>AGUI</h1><p>Waiting for generated content.</p>';
    let { classes } = analyzeMarkup(html);
    let access = createPageAccess(this.record);
    this.access = access;
    let { server, url, styles } = await startPageServer(access);
    this.server = server;
    this.styles = styles;
    publishStyles(styles.build(classes));
    this.restored = cached !== undefined;
    this.record.url = url;
    this.latest = {
      html,
      revision: 0,
      stylesheetUrl: STYLESHEET_PATH,
    };
    signal.throwIfAborted();
    this.pages = new PageConnection(server, new URL(url).origin, access,
      (socket) => this.enqueue(async () => {
        if (this.latest && this.pages && !this.closing) {
          await this.pages.request(socket, { type: 'render', ...this.latest });
        }
      }),
      (message) => this.events.add(message));
  }

  /** @returns {import('../../types/session.js').SessionStatus} */
  status() {
    let clients = this.pages?.clients.size || 0;
    return {
      sessionId: this.record.sessionId,
      state: this.closing ? SESSION_STATE.STOPPED : clients ? SESSION_STATE.READY : SESSION_STATE.WAITING,
      url: this.record.url,
      clients,
      feedback: this.feedback.status(),
      ...(this.tunnel ? { tunnel: { ...this.tunnel.status } } : {}),
      ...(this.tunnel?.origin ? {
        publicUrl: `${this.tunnel.origin}${this.access?.path}`,
        publicUserUrl: `${this.tunnel.origin}${this.access?.path}?mode=user`,
        publicViewerUrl: `${this.tunnel.origin}${this.access?.path}?mode=viewer`,
      } : {}),
    };
  }

  /**
   * @template T
   * @param {() => Promise<T>} task
   * @returns {Promise<T>}
   */
  enqueue(task) {
    let result = this.updates.then(task);
    this.updates = result.then(() => {}, () => {});
    return result;
  }

  /** @param {string} html */
  insert(html) {
    return this.replaceMarkup(html, true);
  }

  async clear() {
    this.clearing += 1;
    try {
      await this.feedback.disable(this.feedback.identity);
      return await this.replaceMarkup('', false);
    } finally { this.clearing -= 1; }
  }

  /** @returns {import('../../types/session.js').SessionFeedbackStatus} */
  feedbackStatus() {
    return { ...this.status(), feedback: this.feedback.status() };
  }

  /** @param {unknown} input */
  async configureFeedback(input) {
    if (this.closing || this.clearing) { throw new CommandError('Feedback cannot be configured during clear or shutdown.'); }
    await this.feedback.configure(input);
    return this.feedbackStatus();
  }

  /** @param {unknown} input */
  async disableFeedback(input) {
    await this.feedback.disable(input);
    return this.feedbackStatus();
  }

  sync() {
    return this.replaceMarkup('', true, true);
  }

  /**
   * @param {string} html
   * @param {boolean} persist
   * @param {boolean} [fromSaved]
   */
  replaceMarkup(html, persist, fromSaved = false) {
    return this.enqueue(async () => {
      if (this.closing || !this.styles || !this.pages || !this.latest) {
        throw new CommandError('The session is stopped.', ERROR_CODE.SESSION_STOPPED, EXIT_CODE.RUNTIME_ERROR);
      }
      let previous = getStyles();
      /** @type {import('../../types/session.js').PreparedCache | undefined} */
      let cache;
      try {
        if (fromSaved) {
          let saved = await readCachedMarkup(this.record.sessionId);
          if (saved === undefined) { throw new CommandError('No saved definition to sync.', ERROR_CODE.CACHE_ERROR, EXIT_CODE.RUNTIME_ERROR); }
          html = saved;
        }
        let { classes } = analyzeMarkup(html);
        let stylesheet = this.styles.build(classes);
        if (persist && !fromSaved) { cache = await prepareCachedMarkup(this.record.sessionId, html); }
        publishStyles(stylesheet);
        this.revision += 1;
        let update = {
          html,
          revision: this.revision,
          stylesheetUrl: `${STYLESHEET_PATH}?revision=${this.revision}`,
        };
        let applied = await this.pages.broadcast({ type: 'render', ...update });
        if (cache) { await cache.commit(); }
        else if (!persist) { await clearCachedMarkup(this.record.sessionId); }
        this.latest = update;
        return { ...this.status(), delivery: applied ? 'applied' : 'queued', ...(fromSaved ? { synced: true } : {}), ...(!persist ? { cleared: true } : {}) };
      } catch (error) {
        publishStyles(previous);
        if (error instanceof CommandError && error.code === ERROR_CODE.CACHE_ERROR) { throw error; }
        let operation = persist ? 'insert markup' : 'clear the interface';
        throw new CommandError(`Could not ${operation}: ${errorMessage(error)}`, persist ? ERROR_CODE.INSERT_FAILED : ERROR_CODE.CLEAR_FAILED, EXIT_CODE.RUNTIME_ERROR);
      } finally {
        await cache?.discard();
      }
    });
  }

  /** @param {unknown} input */
  update(input) {
    return this.enqueue(async () => {
      let update;
      try {
        update = validateStateUpdate(input);
      } catch (error) {
        throw new CommandError(errorMessage(error));
      }
      if (this.closing || !this.pages || ![...this.pages.pages.values()].some((page) => page.role !== PAGE_ROLE.VIEWER)) {
        throw new CommandError('Open the session URL before updating component state.', ERROR_CODE.PAGE_UNAVAILABLE, EXIT_CODE.RUNTIME_ERROR);
      }
      try {
        await this.pages.broadcast({ type: 'update', ...update });
        return { ...this.status(), delivery: 'applied' };
      } catch (error) {
        throw new CommandError(`Could not update state: ${errorMessage(error)}`, ERROR_CODE.UPDATE_FAILED, EXIT_CODE.RUNTIME_ERROR);
      }
    });
  }

  async close() {
    this.closing = true;
    try {
      await this.feedback.close();
      await this.pages?.close();
    }
    finally {
      await this.tunnel?.close();
      await this.tunnelOperations;
      await this.updates;
      await closeServer(this.server);
    }
  }

  /** @param {boolean} [recreate] */
  share(recreate = false) {
    if (recreate && this.tunnelRenewal) { return this.tunnelRenewal; }
    let task = this.tunnelOperations.then(() => this.openTunnel(recreate));
    this.tunnelOperations = task.then(() => {}, () => {});
    if (recreate) {
      this.tunnelRenewal = task;
      let clear = () => { this.tunnelRenewal = undefined; };
      void task.then(clear, clear);
    }
    return task;
  }

  /** @param {boolean} recreate */
  async openTunnel(recreate) {
    if (this.closing || !this.record.url || !this.access) {
      throw new CommandError('The session is stopped.', ERROR_CODE.SESSION_STOPPED, EXIT_CODE.RUNTIME_ERROR);
    }
    if (recreate) {
      await this.tunnel?.close();
      this.tunnel = undefined;
      if (this.closing) {
        throw new CommandError('The session is stopped.', ERROR_CODE.SESSION_STOPPED, EXIT_CODE.RUNTIME_ERROR);
      }
    }
    let access = this.access;
    this.tunnel ||= new SessionTunnel(this.record.url, (origin) => { access.publicOrigin = origin; }, recordDirectory(this.record));
    try {
      await this.tunnel.start();
      if (this.closing) { throw new Error('The session ended while sharing.'); }
      await this.enqueue(async () => {
        access.sharing = true;
        this.pages?.shared.enable(this.latest?.revision || 0);
      });
      return this.status();
    } catch (error) {
      throw new CommandError(`Could not share session ${this.record.sessionId}: ${errorMessage(error)}`, ERROR_CODE.TUNNEL_FAILED, EXIT_CODE.RUNTIME_ERROR);
    }
  }

  /** @param {unknown} input */
  async tools(input) {
    let deadline = Date.now() + TOOL_OPERATION_TIMEOUT_MS;
    try {
      return await withTimeout(this.enqueue(async () => {
        if (this.closing || !this.pages || !this.record.url) {
          throw new CommandError('The session is stopped.', ERROR_CODE.SESSION_STOPPED, EXIT_CODE.RUNTIME_ERROR);
        }
        if (Date.now() >= deadline) { throw new Error('Tool request expired before execution. It was not started.'); }
        let toolResponse = await handleToolRequest(this.pages, this.record.url, input, deadline);
        return { ...this.status(), toolResponse };
      }), TOOL_OPERATION_TIMEOUT_MS, 'Tool request timed out. Its outcome may be unknown; do not retry automatically.');
    } catch (error) {
      if (error instanceof CommandError) { throw error; }
      throw new CommandError(errorMessage(error), ERROR_CODE.TOOL_FAILED, EXIT_CODE.RUNTIME_ERROR);
    }
  }
}
