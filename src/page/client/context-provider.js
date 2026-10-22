import { AguiComponent } from './component.js';
import { initializeContext, releaseContext } from './contexts.js';
import { DICT, css } from '@symbiotejs/symbiote';
import { readInitialData } from '../../markup/data.js';

export class ContextProvider extends AguiComponent {
  processInnerHtml = true;
  /** @type {import('@symbiotejs/symbiote').PubSub<import('../../../types/components.js').ComponentState> | undefined} */
  providedContext;
  providedName = '';
  /** @type {Set<string>} */
  mirrored = new Set();

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
