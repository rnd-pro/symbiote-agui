import { startManager } from './lifecycle.js';
import { errorMessage } from '../shared/system-error.js';

try {
  let result = await startManager(false);
  process.send?.({
    ok: true,
    result,
  }, () => process.connected && process.disconnect());
} catch (error) {
  process.send?.({
    ok: false,
    message: errorMessage(error),
  }, () => process.connected && process.disconnect());
  process.exitCode = 1;
}
