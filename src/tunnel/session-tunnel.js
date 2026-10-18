import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getCloudflared } from './binary.js';
import { TUNNEL_START_TIMEOUT_MS, TUNNEL_STOP_TIMEOUT_MS } from './constants.js';
import { errorMessage } from '../shared/system-error.js';

/** @param {string} text */
export function readTunnelOrigin(text) {
  let match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com(?::[0-9]+)?\b/);
  if (!match) { return undefined; }
  let url = new URL(match[0]);
  return url.hostname === 'api.trycloudflare.com' ? undefined : url.origin;
}

export class SessionTunnel {
  /** @type {import('node:child_process').ChildProcess | undefined} */
  child;
  /** @type {Promise<string> | undefined} */
  starting;
  /** @type {AbortController | undefined} */
  controller;
  /** @type {Promise<void> | undefined} */
  stopping;
  /** @type {import('../../types/session.js').TunnelStatus} */
  status = { state: 'starting', active: null };
  /** @type {string | undefined} */
  origin;

  /**
   * @param {string} localUrl
   * @param {(origin?: string) => void} onOrigin
   * @param {string} directory
   */
  constructor(localUrl, onOrigin, directory) {
    this.localOrigin = new URL(localUrl).origin;
    this.onOrigin = onOrigin;
    this.directory = directory;
  }

  start() {
    if (this.origin) { return Promise.resolve(this.origin); }
    if (this.starting) { return this.starting; }
    this.controller = new AbortController();
    let signal = AbortSignal.any([this.controller.signal, AbortSignal.timeout(TUNNEL_START_TIMEOUT_MS)]);
    this.status = { state: 'starting', active: null };
    this.starting = this.open(signal).catch(async (error) => {
      await this.stopChild();
      this.status = { state: 'failed', active: false, error: errorMessage(error) };
      throw error;
    }).finally(() => { this.starting = undefined; });
    return this.starting;
  }

  /** @param {AbortSignal} signal */
  async open(signal) {
    let executable = await getCloudflared(signal);
    let config = join(this.directory, 'tunnel-config.yml');
    await writeFile(config, '{}\n', { mode: 0o600 });
    signal.throwIfAborted();
    let child = spawn(executable, [
      'tunnel', '--config', config, '--no-autoupdate', '--url', this.localOrigin,
      '--protocol', 'http2', '--metrics', '127.0.0.1:0',
    ], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    this.child = child;
    return new Promise((resolve, reject) => {
      let origin = '';
      let registered = false;
      let settled = false;
      let lastError = '';
      let lastLine = '';
      let readers = [child.stdout, child.stderr].filter((stream) => stream !== null)
        .map((input) => createInterface({ input }));
      let cleanup = () => signal.removeEventListener('abort', abort);
      let abort = () => { cleanup(); reject(signal.reason); };
      signal.addEventListener('abort', abort, { once: true });
      child.once('error', (error) => { cleanup(); reject(error); });
      child.once('exit', (code, reason) => {
        for (let reader of readers) { reader.close(); }
        cleanup();
        this.child = undefined;
        this.origin = undefined;
        this.onOrigin(undefined);
        let message = lastError || lastLine || `cloudflared exited (${reason || code}). Run share again to create a new tunnel.`;
        if (settled && !this.controller?.signal.aborted) { this.status = { state: 'failed', active: false, error: message }; }
        reject(new Error(message));
      });
      for (let reader of readers) {
        reader.on('line', (line) => {
          if (line.trim()) { lastLine = line.slice(-1_000); }
          if (line.includes('"level":"error"') || /\bERR\b/.test(line) || line.startsWith('Incorrect Usage')) { lastError = line.slice(-1_000); }
          origin ||= readTunnelOrigin(line) || '';
          registered ||= line.includes('Registered tunnel connection');
          if (!settled && origin && registered && !signal.aborted) {
            settled = true;
            cleanup();
            this.origin = origin;
            this.onOrigin(origin);
            this.status = { state: 'ready', active: null };
            resolve(origin);
          }
        });
      }
      if (signal.aborted) { abort(); }
    });
  }

  async stopChild() {
    let child = this.child;
    if (!child || child.exitCode !== null || child.signalCode !== null || !child.pid) { return; }
    await new Promise((resolve) => {
      let timer = setTimeout(() => child.kill('SIGKILL'), TUNNEL_STOP_TIMEOUT_MS);
      child.once('exit', () => { clearTimeout(timer); resolve(undefined); });
      child.kill('SIGTERM');
    });
  }

  close() {
    if (!this.stopping) {
      this.controller?.abort(new Error('The session ended while starting its tunnel.'));
      this.stopping = (async () => {
        await this.stopChild();
        await this.starting?.catch(() => {});
        this.origin = undefined;
        this.onOrigin(undefined);
        this.status = { state: 'stopped', active: false };
      })();
    }
    return this.stopping;
  }
}
