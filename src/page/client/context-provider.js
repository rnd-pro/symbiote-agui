import { AguiComponent } from './component.js';
import { initializeContext, releaseContext } from './contexts.js';
import { DICT, css } from '@symbiotejs/symbiote';
import { isPlainStateKey, readInitialData } from '../../markup/data.js';

export class ContextProvider extends AguiComponent {
  processInnerHtml = true;
  /** @type {import('@symbiotejs/symbiote').PubSub<import('../../../types/components.js').ComponentState> | undefined} */
  providedContext;
  providedName = '';
  /** @type {Set<string>} */
  mirrored = new Set();
  /** @type {import('../../../types/components.js').ComponentState | undefined} */
  boundState;
  /** @type {Set<string>} */
  stateKeys = new Set();
  applyingState = false;

  /**
   * @param {string | DocumentFragment} [template]
   * @param {boolean} [shadow]
   */
  render(template, shadow) {
    // Populate owner fields before template children resolve their ^ bindings.
    if (!this.connectedOnce) {
      this.defineAccessor('state', (/** @type {unknown} */ value) => this.applyState(value));
    }
    super.render(template, shadow);
  }

  /** @param {unknown} value */
  applyState(value) {
    if (value === undefined) { return; }
    if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || Object.keys(value).some((key) => !isPlainStateKey(key))) {
      throw new Error('Provider state must be a plain object with local state keys.');
    }
    let next = { ...value };
    this.applyingState = true;
    try {
      let previous = this.boundState;
      this.boundState = next;
      for (let key of Object.keys(previous ?? {})) {
        // Retain ownership so descendant ^ bindings cannot fall through to an
        // unrelated ancestor when a field disappears from the source object.
        if (!Object.hasOwn(next, key)) { this.$[key] = undefined; }
      }
      this.add$(next, true);
      for (let key of Object.keys(next)) {
        if (this.stateKeys.has(key)) { continue; }
        this.stateKeys.add(key);
        this.sub(key, (current) => this.publishState(key, current), false);
      }
    } finally {
      this.applyingState = false;
    }
  }

  /**
   * @param {string} key
   * @param {unknown} value
   */
  publishState(key, value) {
    if (this.applyingState || !this.boundState || !Object.hasOwn(this.boundState, key)
      || Object.is(this.boundState[key], value)) { return; }
    this.boundState = {
      ...this.boundState,
      [key]: value,
    };
    let target = this.getAttribute('pub-to')?.trim();
    if (target && this.isConnected) { this.$[target] = this.boundState; }
  }

  connectedCallback() {
    let initialize = !this.connectedOnce;
    let name = this.getAttribute(DICT.CTX_NAME_ATTR)?.trim();
    if (initialize && name) {
      this.providedName = name;
      this.providedContext = initializeContext(name, { ...this.init$, ...readInitialData(this) });
    }
    super.connectedCallback();

    if (initialize && this.providedContext) {
      for (let key of Object.keys(this.init$)) {
        this.mirrorProperty(key);
      }
    }
  }

  /** @param {string} key */
  mirrorProperty(key) {
    let context = this.providedContext;
    if (!context || this.mirrored.has(key) || this.Symbiote.parseProp(key, this)?.scope !== 'local') {
      return;
    }

    this.mirrored.add(key);
    let local = this.localCtx;
    this.sub(key, (value) => {
      if (!Object.is(context.read(key), value)) {
        context.add(key, value, true);
      }
    });
    let subscription = context.sub(key, (value) => {
      if (!Object.is(local.read(key), value)) {
        local.pub(key, value);
      }
    });
    if (subscription) {
      this.allSubs.add(subscription);
    }
  }

  /**
   * @param {import('../../../types/components.js').ComponentState} values
   * @param {boolean} [rewrite]
   */
  add$(values, rewrite = false) {
    super.add$(values, rewrite);
    for (let key of Object.keys(values)) {
      this.mirrorProperty(key);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    queueMicrotask(() => {
      if (!this.isConnected && this.providedContext) {
        releaseContext(this.providedName, this.providedContext);
      }
    });
  }
}

ContextProvider.rootStyles = css`@layer components { context-provider { display: contents; } }`;
