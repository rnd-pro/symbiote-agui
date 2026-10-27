import { startControlServer } from '../server/control-server.js';
import { closeServer } from '../shared/server.js';
import { errorMessage } from '../shared/system-error.js';
import { STARTUP_TIMEOUT_MS } from './constants.js';
import { SessionRuntime } from './runtime.js';
import { releaseSession, writeSession } from './store.js';

process.once('message', async (message) => {
  let record = /** @type {import('../../types/session.js').SessionRecord} */ (message);
  let runtime = new SessionRuntime(record);
  let controller = new AbortController();
  let ready = false;
  /** @type {import('node:http').Server | undefined} */
  let control;
  /** @type {Promise<void> | undefined} */
  let stopping;
  let starting = runtime.start(controller.signal);
  let timer = setTimeout(() => controller.abort(new Error('Session startup timed out.')), STARTUP_TIMEOUT_MS);

  async function stopResources() {
    if (!stopping) {
      stopping = (async () => {
        await starting.catch(() => {});
        await runtime.close();
        await releaseSession(record);
      })().catch((error) => {
        stopping = undefined;
        throw error;
      });
    }
    await stopping;
  }

  async function shutdown() {
    if (!ready) {
      controller.abort();
    }
    try {
      await stopResources();
      await closeServer(control);
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    }
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('SIGHUP', shutdown);
  process.on('disconnect', () => {
    if (!ready) {
      void shutdown();
    }
  });
  process.on('message', (next) => {
    if (next === 'abort') {
      void shutdown();
    }
  });

  try {
    await starting;
    controller.signal.throwIfAborted();
    let endpoint = await startControlServer(record, () => runtime.status(), stopResources, {
      insert: (html) => runtime.insert(html),
      update: (input) => runtime.update(input),
      events: () => ({ ...runtime.status(), ...runtime.events.drain() }),
      tools: (input) => runtime.tools(input),
      clear: () => runtime.clear(),
      sync: (resetData) => runtime.sync(resetData),
      share: () => runtime.share(),
      tunnelRenew: () => runtime.share(true),
      tunnelStop: () => runtime.stopTunnel(),
      connections: () => runtime.connections(),
      disconnectPage: (input) => runtime.disconnectPage(input),
      transferSnapshot: () => runtime.transferSnapshot(),
      feedbackConfigure: (input) => runtime.configureFeedback(input),
      feedbackStatus: () => runtime.feedbackStatus(),
      feedbackSettings: () => runtime.feedback.settings(),
      feedbackCheck: (input) => runtime.checkFeedback(input),
      feedbackDisable: (input) => runtime.disableFeedback(input),
    });
    control = endpoint.server;
    record.controlUrl = endpoint.url;
    await writeSession(record);
    controller.signal.throwIfAborted();
    ready = true;
    /** @type {import('../../types/session.js').WorkerReply} */
    let reply = { kind: 'ready', result: { ...runtime.status(), restored: runtime.restored } };
    process.send?.(reply, () => process.connected && process.disconnect());
  } catch (error) {
    console.error(error);
    await shutdown();
    /** @type {import('../../types/session.js').WorkerReply} */
    let reply = { kind: 'failed', message: errorMessage(error) };
    if (process.connected) {
      process.send?.(reply, () => process.connected && process.disconnect());
    }
    process.exitCode = 1;
  } finally {
    clearTimeout(timer);
  }
});

// A launcher that exits before sending its reservation has not created any resources.
process.once('disconnect', () => {});
