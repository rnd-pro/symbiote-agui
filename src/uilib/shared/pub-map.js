import { isPlainStateKey } from './initial-data.js';

/**
 * @typedef {Object} Publication
 * @property {string} target
 * @property {string} source
 */

export class PubMap {
  connected = false;
  queued = false;
  version = 0;
  /** @type {Publication[]} */
  bindings = [];
  /** @type {{ remove(): void }[]} */
  subscriptions = [];

  /** @param {import('../../../types/components.js').ComponentHost} owner */
  constructor(owner) {
    this.owner = owner;
  }

  connect() {
    if (this.connected || !this.owner.isConnected) { return; }
    this.connected = true;
    this.refresh();
  }

  disconnect() {
    this.connected = false;
    this.reset();
  }

  reset() {
    this.version += 1;
    this.queued = false;
    for (let subscription of this.subscriptions) { subscription.remove(); }
    this.subscriptions = [];
    this.bindings = [];
  }

  refresh() {
    if (!this.connected) { return; }
    this.reset();
    let targets = new Set();
    let definition = this.owner.getAttribute('pub-map') || '';
    let bindings = definition.split(';').filter((entry) => entry.trim()).map((entry) => {
      let parts = entry.split(':').map((part) => part.trim());
      let [
        target,
        source,
      ] = parts;
      if (parts.length !== 2 || !target || !source || /\s/.test(target + source)
        || !isPlainStateKey(source.startsWith('+') ? source.slice(1) : source)
        || targets.has(target)) {
        throw new TypeError('pub-map requires unique target: localProperty pairs separated by semicolons.');
      }
      if (!this.owner.localCtx.has(source)) {
        throw new TypeError(`Unknown pub-map source property: ${source}.`);
      }
      targets.add(target);
      return {
        target,
        source,
      };
    });
    this.bindings = bindings;
    for (let source of new Set(bindings.map((binding) => binding.source))) {
      let subscription = this.owner.localCtx.sub(source, () => this.schedule(), false);
      if (subscription) { this.subscriptions.push(subscription); }
    }
    this.schedule();
  }

  schedule() {
    if (this.queued || !this.connected || !this.bindings.length) { return; }
    this.queued = true;
    let version = this.version;
    queueMicrotask(() => {
      if (version !== this.version) { return; }
      this.queued = false;
      if (this.connected && this.owner.isConnected) { this.publish(); }
    });
  }

  publish() {
    /** @type {import('../../../types/components.js').ComponentState} */
    let updates = Object.create(null);
    for (let {
      target,
      source,
    } of this.bindings) {
      let value = this.owner.$[source];
      if (value === undefined) { continue; }
      let resolved = this.owner.Symbiote.parseProp(target, this.owner);
      if (!resolved || !isPlainStateKey(resolved.name)) {
        throw new TypeError(`pub-map requires an available writable context target: ${target}.`);
      }
      if (!resolved.ctx.has(resolved.name) || !Object.is(resolved.ctx.read(resolved.name), value)) {
        updates[target] = value;
      }
    }
    // Read the whole mapping first; native merging resolves and publishes its targets.
    this.owner.$ = updates;
  }
}
