import {
  css,
} from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-data-toolbar {
      --agui-icon-size: 1.25rem;
      --agui-icon-optical-size: 20;
      display: block;
      grid-column: 1 / -1;
      min-width: 0;
      height: var(--agui-data-toolbar-height, 0px);
    }
    .agui-data-bar {
      --agui-data-gutter: 1rem;
      position: fixed;
      z-index: 30;
      inset-inline: 0;
      bottom: 0;
      padding: .5rem;
      padding-bottom: max(.5rem, env(safe-area-inset-bottom));
      border-top: 1px solid var(--agui-border);
      background: var(--agui-surface);
      box-shadow: 0 -.25rem 1rem #0001;
    }
    .agui-data-marker {
      display: inline-flex;
      align-items: center;
      min-height: var(--agui-control-height);
      padding-inline: .5rem;
      font-size: .875rem;
      color: var(--agui-muted);
    }
    .agui-data-marker[data-connected='false'] {
      color: var(--agui-danger);
    }
    .agui-data-messages {
      position: fixed;
      z-index: 31;
      inset: auto max(.5rem, env(safe-area-inset-right)) calc(var(--agui-data-bar-height, 0px) + .5rem) auto;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: .25rem .75rem;
      box-sizing: border-box;
      width: fit-content;
      max-width: min(28rem, calc(100% - 1rem - env(safe-area-inset-left) - env(safe-area-inset-right)));
      max-height: 40dvh;
      overflow: auto;
      margin: 0;
      padding: .5rem .75rem;
      border: 1px solid var(--agui-border);
      border-radius: .5rem;
      background: var(--agui-surface);
      color: var(--agui-text);
      box-shadow: 0 .25rem 1rem #0002;
      opacity: 0;
      transform: translateY(.5rem);
    }
    .agui-data-messages:not([hidden]):not([data-closing]) {
      opacity: 1;
      transform: translateY(0);
    }
    .agui-data-messages[hidden] {
      display: none;
      pointer-events: none;
    }
    .agui-data-messages[data-closing] {
      pointer-events: none;
    }
    .agui-data-status {
      display: flex;
      flex-wrap: wrap;
      gap: .25rem 1rem;
      color: var(--agui-muted);
      font-size: .875rem;
      overflow-wrap: anywhere;
    }
    .agui-data-status > span:empty {
      display: none;
    }
    .agui-data-error {
      grid-column: 1;
      margin: 0;
      overflow-wrap: anywhere;
      color: var(--agui-danger);
      font-size: .875rem;
    }
    .agui-data-dismiss {
      grid-column: 2;
      grid-row: 1 / span 2;
    }
    html:has(agui-data-toolbar) {
      scroll-padding-bottom: var(--agui-data-toolbar-height, 0px);
    }
    @media (prefers-reduced-motion: no-preference) {
      .agui-data-messages {
        transition-property: opacity, transform, display, overlay;
        transition-duration: 180ms;
        transition-timing-function: ease-out;
        transition-behavior: allow-discrete;
      }
      @starting-style {
        .agui-data-messages:not([hidden]):not([data-closing]) {
          opacity: 0;
          transform: translateY(.5rem);
        }
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .agui-data-messages {
        transform: none;
      }
    }
    @media (width >= 40rem) {
      .agui-data-bar {
        --agui-data-gutter: 1.5rem;
      }
    }
  }
`;
