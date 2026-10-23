import {
  css,
} from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-message {
      position: fixed;
      z-index: 31;
      inset: auto max(.5rem, env(safe-area-inset-right)) calc(var(--agui-data-toolbar-height, 0px) + var(--agui-message-offset, 0px) + .5rem) auto;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: .75rem;
      box-sizing: border-box;
      width: fit-content;
      max-width: min(28rem, calc(100% - 1rem - env(safe-area-inset-left) - env(safe-area-inset-right)));
      max-height: 40dvh;
      overflow: auto;
      margin: 0;
      padding: .5rem;
      border: 0;
      border-radius: var(--agui-radius-inset);
      background: var(--agui-accent);
      color: var(--agui-on-accent);
      box-shadow: var(--agui-shadow-floating);
      pointer-events: none;
      opacity: 0;
      transform: translateY(.5rem);
    }
    agui-message[data-tone='alert'] {
      background: var(--agui-danger);
    }
    agui-message:not([hidden]):not([data-closing]) {
      opacity: 1;
      transform: translateY(0);
    }
    agui-message[hidden] {
      display: none;
    }
    agui-message[data-closing] {
      pointer-events: none;
    }
    .agui-message-text {
      margin: 0;
      white-space: pre-line;
      overflow-wrap: anywhere;
      font-size: .875rem;
    }
    .agui-message-dismiss {
      pointer-events: auto;
    }
    @media (prefers-reduced-motion: no-preference) {
      agui-message {
        transition-property: opacity, transform, display, overlay;
        transition-duration: 180ms;
        transition-timing-function: var(--agui-motion-ease);
        transition-behavior: allow-discrete;
      }
      @starting-style {
        agui-message:not([hidden]):not([data-closing]) {
          opacity: 0;
          transform: translateY(.5rem);
        }
      }
    }
    @media (prefers-reduced-motion: reduce) {
      agui-message {
        transform: none;
      }
    }
  }
`;
