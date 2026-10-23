import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-tabs {
      display: grid;
      min-inline-size: 0;
      gap: 1rem;
    }
    .agui-tabs-list {
      display: flex;
      align-items: stretch;
      min-inline-size: 0;
      gap: .5rem;
      overflow: auto;
      padding: 0;
      border-bottom: 1px solid var(--agui-divider);
    }
    agui-tab-button {
      display: contents;
    }
    .agui-tab-trigger {
      position: relative;
      flex-shrink: 0;
      height: auto;
      min-height: var(--agui-control-height);
      padding: .625rem .75rem;
      font-weight: inherit;
      white-space: nowrap;
      color: var(--agui-muted);
    }
    .agui-tab-trigger,
    .agui-tab-trigger:hover:enabled,
    .agui-tab-trigger:active:enabled {
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
    }
    .agui-tab-trigger::after {
      position: absolute;
      inset-inline: .75rem;
      inset-block-end: 0;
      block-size: 2px;
      background: transparent;
      content: '';
    }
    .agui-tab-trigger:hover:enabled,
    .agui-tab-trigger[aria-selected='true'] {
      color: var(--agui-text);
    }
    .agui-tab-trigger[aria-selected='true']::after {
      background: var(--agui-accent);
    }
    .agui-tab-trigger:focus-visible {
      outline-offset: -2px;
    }
    .agui-tabs-panels,
    agui-tab {
      display: block;
      min-inline-size: 0;
    }
    agui-tab[hidden] {
      display: none;
    }
    agui-tab:focus-visible {
      outline: 2px solid var(--agui-accent);
      outline-offset: 2px;
    }
    agui-tabs[data-orientation='vertical'] {
      grid-template-columns: fit-content(16rem) minmax(0, 1fr);
    }
    .agui-tabs-list[aria-orientation='vertical'] {
      flex-direction: column;
      align-self: start;
      border-bottom: 0;
      border-inline-end: 1px solid var(--agui-divider);
    }
    .agui-tabs-list[aria-orientation='vertical'] .agui-tab-trigger {
      justify-content: flex-start;
      text-align: start;
      white-space: normal;
      overflow-wrap: anywhere;
    }
    .agui-tabs-list[aria-orientation='vertical'] .agui-tab-trigger::after {
      inset-block: .5rem;
      inset-inline-start: auto;
      inset-inline-end: 0;
      inline-size: 2px;
      block-size: auto;
    }
    @supports (anchor-name: --agui-active-tab) and (anchor-scope: --agui-active-tab) {
      .agui-tabs-list {
        position: relative;
        anchor-scope: --agui-active-tab;
      }
      .agui-tab-trigger[aria-selected='true'] {
        anchor-name: --agui-active-tab;
      }
      .agui-tab-trigger::after {
        content: none;
      }
      .agui-tabs-list:has([aria-selected='true'])::after {
        position: absolute;
        position-anchor: --agui-active-tab;
        inset-inline-start: calc(anchor(start) + .75rem);
        inset-inline-end: calc(anchor(end) + .75rem);
        inset-block-start: calc(anchor(end) - 2px);
        inset-block-end: anchor(end);
        background: var(--agui-accent);
        pointer-events: none;
        content: '';
      }
      .agui-tabs-list[aria-orientation='vertical']::after {
        inset-inline-start: calc(anchor(end) - 2px);
        inset-inline-end: anchor(end);
        inset-block-start: calc(anchor(start) + .5rem);
        inset-block-end: calc(anchor(end) + .5rem);
      }
      @media (prefers-reduced-motion: no-preference) {
        .agui-tabs-list::after {
          transition: inset var(--agui-motion-fast) var(--agui-motion-ease);
        }
      }
    }
    @media (forced-colors: active) {
      .agui-tabs-list:has([aria-selected='true'])::after,
      .agui-tab-trigger[aria-selected='true']::after {
        forced-color-adjust: none;
        background: Highlight;
      }
    }
  }
`;
