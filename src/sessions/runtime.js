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
import { TOOL_OPERATION_TIMEOUT_MS } from '../transport/constants.js';
import { withTimeout } from '../shared/timeout.js';

export class SessionRuntime {
  /** @type {import('node:http').Server | undefined} */
  server;
  /** @type {PageConnection | undefined} */
  pages;
  /** @type {import('../../types/markup.js').StyleCompiler | undefined} */
  styles;
  /** @type {import('../../types/transport.js').RenderUpdate | undefined} */
  latest;
  updates = Promise.resolve();
  events = new SessionEvents();
  revision = 0;
  closing = false;

  /** @param {import('../../types/session.js').SessionRecord} record */
  constructor(record) {
    this.record = record;
  }

  /** @param {AbortSignal} signal */
  async start(signal) {
    let access = createPageAccess(this.record);
    let { server, url, styles } = await startPageServer(access);
    this.server = server;
    this.styles = styles;
    this.record.url = url;
    this.latest = {
      html: '<h1>AGUI</h1><p>Waiting for generated content.</p>',
      revision: 0,
      stylesheetUrl: new URL(STYLESHEET_PATH, url).href,
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
    return this.enqueue(async () => {
      if (this.closing || !this.styles || !this.pages || !this.latest) {
        throw new CommandError('The session is stopped.', ERROR_CODE.SESSION_STOPPED, EXIT_CODE.RUNTIME_ERROR);
      }
      let previous = getStyles();
      try {
        let { classes } = analyzeMarkup(html);
        publishStyles(this.styles.build(classes));
        this.revision += 1;
        let update = {
          html,
          revision: this.revision,
          stylesheetUrl: new URL(`${STYLESHEET_PATH}?revision=${this.revision}`, this.record.url).href,
        };
        let applied = await this.pages.broadcast({ type: 'render', ...update });
        this.latest = update;
        return { ...this.status(), delivery: applied ? 'applied' : 'queued' };
      } catch (error) {
        publishStyles(previous);
        throw new CommandError(`Could not insert markup: ${errorMessage(error)}`, ERROR_CODE.INSERT_FAILED, EXIT_CODE.RUNTIME_ERROR);
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
      if (this.closing || !this.pages?.clients.size) {
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
    await this.pages?.close();
    await this.updates;
    await closeServer(this.server);
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
