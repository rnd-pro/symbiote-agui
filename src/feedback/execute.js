import { spawn } from 'node:child_process';
import { FEEDBACK_ENVIRONMENT, FEEDBACK_LIMITS, feedbackFailure } from './constants.js';

/**
 * @param {import('../../types/feedback.js').FeedbackCommand} command
 * @param {import('../../types/feedback.js').FeedbackEnvelope} envelope
 * @param {AbortSignal} signal
 * @param {number} [timeoutMs]
 * @returns {Promise<import('../../types/feedback.js').FeedbackExecution>}
 */
export function executeFeedback(command, envelope, signal, timeoutMs = FEEDBACK_LIMITS.executionMs) {
  return new Promise((resolve) => {
    let payload = JSON.stringify(envelope);
    let args = [...command.args];
    if (command.input.channel === 'argument') { args.splice(command.input.index, 0, payload); }
    let env = Object.fromEntries(FEEDBACK_ENVIRONMENT.flatMap((key) => process.env[key] === undefined ? [] : [[key, process.env[key]]]));
    let spawned = false;
    let finished = false;
    let terminating = false;
    let bytes = 0;
    /** @type {Buffer[]} */
    let output = [];
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let killTimer;
    /** @type {import('node:child_process').ChildProcessWithoutNullStreams | undefined} */
    let child;
    let timer = setTimeout(terminate, timeoutMs);

    /** @param {import('../../types/feedback.js').FeedbackExecution} result */
    function finish(result) {
      if (finished) { return; }
      finished = true;
      clearTimeout(timer);
      clearTimeout(killTimer);
      signal.removeEventListener('abort', terminate);
      child?.stdin.destroy();
      child?.stdout.destroy();
      child?.stderr.destroy();
      resolve(result);
    }

    /** @param {NodeJS.Signals} name */
    function kill(name) {
      if (!child?.pid) { return; }
      try {
        if (process.platform === 'win32') { child.kill(name); }
        else { process.kill(-child.pid, name); }
      } catch { /* The owned command may already have exited. */ }
    }

    function unknown() {
      finish({ state: 'unknown', failure: feedbackFailure('DELIVERY_UNKNOWN') });
    }

    function terminate() {
      if (finished || terminating) { return; }
      terminating = true;
      kill('SIGTERM');
      killTimer = setTimeout(() => { kill('SIGKILL'); unknown(); }, FEEDBACK_LIMITS.killGraceMs);
    }

    signal.addEventListener('abort', terminate, { once: true });
    if (signal.aborted) {
      finish({ state: 'rejected', failure: feedbackFailure('DISABLED') });
      return;
    }
    try {
      child = spawn(command.executable, args, { cwd: command.cwd, env, shell: false,
        detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
    } catch {
      finish({ state: 'rejected', failure: feedbackFailure('COMMAND_FAILED') });
      return;
    }
    child.on('spawn', () => { spawned = true; });
    child.on('error', () => spawned ? terminate() : finish({ state: 'rejected', failure: feedbackFailure('COMMAND_FAILED') }));
    child.stdin.on('error', terminate);
    child.stdout.on('error', terminate);
    child.stderr.on('error', terminate);
    child.stdout.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > FEEDBACK_LIMITS.outputBytes) { terminate(); }
      else { output.push(chunk); }
    });
    child.stderr.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > FEEDBACK_LIMITS.outputBytes) { terminate(); }
    });
    child.on('close', (code) => {
      if (finished) { return; }
      if (terminating || code !== 0) { kill('SIGKILL'); unknown(); return; }
      try {
        let result = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(output)));
        if (!result || !['accepted', 'unavailable', 'rejected', 'unknown'].includes(result.state)
          || Object.keys(result).some((key) => key !== 'state' && (key !== 'receiptId' || result.state !== 'accepted'))
          || (result.receiptId !== undefined && (typeof result.receiptId !== 'string' || !/^[\w.:-]{1,256}$/.test(result.receiptId)))) {
          unknown(); return;
        }
        finish(result.state === 'unknown' ? { state: 'unknown', failure: feedbackFailure('DELIVERY_UNKNOWN') }
          : { state: result.state, ...(result.receiptId ? { receiptId: result.receiptId } : {}) });
      } catch { unknown(); }
    });
    child.stdin.end(command.input.channel === 'stdin' ? `${payload}\n` : undefined);
  });
}
