import {
  UiComponent,
} from '../../shared/component.js';
import {
  MESSAGE_TIMEOUT_MS,
  MESSAGE_TONES,
} from './constants.js';
import {
  addMessage,
  removeMessage,
  positionMessages,
} from './stack.js';
import {
  MESSAGE_TEMPLATE,
} from './template.js';
import styles from './styles.js';

export class Message extends UiComponent {
  /** @type {number | undefined} */
  timer;
  /** @type {ResizeObserver | undefined} */
  sizeObserver;
  generation = 0;
  disposed = false;
  init$ = {
    message: '',
    tone: 'info',
    timeout: MESSAGE_TIMEOUT_MS,
    closeLabel: '',
    messageRole: 'status',
    liveMode: 'polite',
    iconName: 'info',
    dismiss: () => { void this.hide(); },
  };

  renderCallback() {
    this.hidden = true;
    if ('showPopover' in HTMLElement.prototype) {
      this.setAttribute('popover', 'manual');
    }
    this.sizeObserver = new ResizeObserver(positionMessages);
    this.sizeObserver.observe(this);
    this.sub('tone', (tone) => {
      let key = Object.hasOwn(MESSAGE_TONES, String(tone))
        ? /** @type {import('../../../../../../types/uilib.js').UiMessageTone} */ (tone) : 'info';
      this.setAttribute('data-tone', key);
      this.set$(MESSAGE_TONES[key]);
    });
    this.sub('message', () => this.show());
    this.sub('timeout', () => {
      if (!this.hidden) { this.show(); }
    });
  }

  show() {
    if (this.disposed) { return; }
    if (!String(this.$.message ?? '').trim()) {
      void this.hide();
      return;
    }
    window.clearTimeout(this.timer);
    this.generation += 1;
    this.removeAttribute('data-closing');
    this.hidden = false;
    if (this.hasAttribute('popover') && !this.matches(':popover-open')) {
      this.showPopover();
    }
    addMessage(this);
    let timeout = Number(this.$.timeout);
    this.timer = window.setTimeout(() => { void this.hide(); }, Number.isFinite(timeout) && timeout > 0 ? timeout : MESSAGE_TIMEOUT_MS);
  }

  /** @param {boolean} [immediate] */
  async hide(immediate = false) {
    window.clearTimeout(this.timer);
    this.timer = undefined;
    let generation = ++this.generation;
    if (!immediate && !this.hidden) {
      this.setAttribute('data-closing', '');
      await Promise.allSettled(this.getAnimations().map((animation) => animation.finished));
    }
    if (generation !== this.generation) { return; }
    if (this.hasAttribute('popover') && this.matches(':popover-open')) {
      this.hidePopover();
    }
    this.hidden = true;
    this.removeAttribute('data-closing');
    removeMessage(this);
  }

  destroyCallback() {
    this.disposed = true;
    void this.hide(true);
    this.sizeObserver?.disconnect();
  }
}

Message.bindAttributes({
  message: 'message',
  tone: 'tone',
  timeout: 'timeout',
  'close-label': 'closeLabel',
});
Message.template = MESSAGE_TEMPLATE;
Message.rootStyles = styles;
