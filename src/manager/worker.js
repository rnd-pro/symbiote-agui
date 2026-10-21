import { startManagerServer } from './server.js';
import { releaseManager, writeManager } from './registry.js';
import { errorMessage } from '../shared/system-error.js';

process.once('message', async (message) => {
  let record = /** @type {import('../../types/manager.js').ManagerRecord} */ (message);
  /** @type {Awaited<ReturnType<typeof startManagerServer>> | undefined} */
  let endpoint;
  let ready = false;
  /** @type {Promise<void> | undefined} */
  let stopping;
  let stop = () => {
    stopping ||= (async () => {
      await endpoint?.close();
      await releaseManager(record);
    })().catch((error) => { console.error(error); process.exitCode = 1; });
    return stopping;
  };
  let starting = startManagerServer(record, () => { void stop(); });
  let abort = async () => { await starting.catch(() => {}); await stop(); };
  process.on('SIGTERM', abort);
  process.on('SIGINT', abort);
  process.on('SIGHUP', abort);
  process.on('message', (next) => { if (next === 'abort') { void abort(); } });
  process.on('disconnect', () => { if (!ready) { void abort(); } });
  try {
    endpoint = await starting;
    record.url = endpoint.url;
    await writeManager(record);
    ready = true;
    process.send?.({ kind: 'ready' }, () => process.connected && process.disconnect());
  } catch (error) {
    await stop();
    process.send?.({ kind: 'failed', message: errorMessage(error) }, () => process.connected && process.disconnect());
    process.exitCode = 1;
  }
});
