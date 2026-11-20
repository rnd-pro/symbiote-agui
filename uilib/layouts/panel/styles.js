import {
  css,
} from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-panel {
      display: block;
      min-width: 0;
      border: 1px solid var(--agui-divider);
      border-radius: var(--agui-radius-panel);
      background-color: var(--agui-surface);
      padding: var(--agui-panel-padding);
      box-shadow: var(--agui-shadow-panel);

      agui-panel {
        border-color: var(--agui-divider);
        border-radius: var(--agui-radius-inset);
        background-color: var(--agui-bg);
        box-shadow: none;
      }
    }
    agui-panel > h2 {
      margin-bottom: calc(var(--spacing, .25rem) * 4);
      font-size: var(--text-lg, 1.125rem);
      line-height: var(--text-lg--line-height, 1.5555555556);
      font-weight: var(--font-weight-semibold, 600);
    }
    agui-panel[selectable] {
      border-color: var(--agui-border);
    }
    agui-panel[selectable]:not([aria-disabled='true']) {
      cursor: pointer;
    }
    @media (hover: hover) {
      agui-panel[selectable]:not([aria-disabled='true']):not([data-selected]):hover {
        background-color: var(--agui-hover);
      }
    }
    agui-panel[selectable][data-selected] {
      border-color: var(--agui-accent);
      outline: 2px solid var(--agui-accent);
    }
    agui-panel[selectable]:has(:focus-visible) {
      outline: 2px solid var(--agui-accent);
      outline-offset: 3px;
    }
    @media (prefers-reduced-motion: no-preference) {
      agui-panel[selectable] {
        transition-property: border-color, background-color;
        transition-duration: var(--agui-motion-fast);
        transition-timing-function: var(--agui-motion-ease);
      }
    }
  }
`;
