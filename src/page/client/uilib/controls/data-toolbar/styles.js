import {
  css,
} from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-data-toolbar {
      --agui-icon-optical-size: 20;
      display: block;
      grid-column: 1 / -1;
      min-width: 0;
      height: 0;
    }
    agui-data-toolbar button.agui-data-trigger,
    agui-data-toolbar button.agui-data-trigger:hover,
    agui-data-toolbar button.agui-data-trigger:active {
      --agui-icon-size: 1.5rem;
      position: fixed;
      z-index: 30;
      inset-inline-end: max(1rem, env(safe-area-inset-right));
      inset-block-end: max(1rem, env(safe-area-inset-bottom));
      inline-size: var(--agui-data-trigger-size);
      block-size: var(--agui-data-trigger-size);
      padding: 0;
      border-radius: 50%;
      background: var(--agui-data-indicator-bg, var(--agui-accent));
      color: var(--agui-data-indicator-fg, var(--agui-on-accent));
      box-shadow: var(--agui-shadow-floating);
    }
    .agui-data-trigger[data-tone='accent'] {
      --agui-data-indicator-bg: var(--agui-accent);
      --agui-data-indicator-fg: var(--agui-on-accent);
    }
    .agui-data-trigger[data-tone='warning'] {
      --agui-data-indicator-bg: var(--agui-warning);
      --agui-data-indicator-fg: var(--agui-on-warning);
    }
    .agui-data-trigger[data-tone='danger'] {
      --agui-data-indicator-bg: var(--agui-danger);
      --agui-data-indicator-fg: var(--agui-on-accent);
    }
    .agui-data-trigger[data-tone='success'] {
      --agui-data-indicator-bg: var(--agui-success);
      --agui-data-indicator-fg: var(--agui-on-success);
    }
    .agui-data-panel {
      inline-size: 24rem;
    }
    .agui-data-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .75rem;
      margin-block-end: 1rem;
    }
    .agui-data-heading h2 {
      font-size: 1rem;
      font-weight: 400;
    }
    .agui-data-actions button {
      justify-content: flex-start;
      inline-size: 100%;
      min-inline-size: 0;
    }
    .agui-data-markers {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: .5rem;
      margin-block-start: 1rem;
    }
    .agui-data-status {
      display: grid;
      gap: .375rem;
      margin-block-start: .75rem;
      color: var(--agui-muted);
      font-size: .8125rem;
      white-space: pre-line;
      overflow-wrap: anywhere;
    }
    .agui-data-error {
      color: var(--agui-danger);
    }
    .agui-data-metadata {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    html:has(agui-data-toolbar) {
      --agui-data-trigger-size: 3.25rem;
      --agui-data-toolbar-height: calc(var(--agui-data-trigger-size) + max(1rem, env(safe-area-inset-bottom)));
      scroll-padding-bottom: var(--agui-data-toolbar-height, 0px);
    }
    @supports (position-area: block-start) {
      agui-data-toolbar .agui-data-panel.agui-popover[popover] {
        position-area: block-start span-inline-start;
      }
    }
    @media (prefers-reduced-motion: no-preference) {
      .agui-data-trigger[data-busy] agui-icon {
        animation: agui-data-working 1.2s linear infinite;
      }
    }
    @keyframes agui-data-working {
      to {
        rotate: 360deg;
      }
    }
  }
`;
