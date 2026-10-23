import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-sidebar {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      min-inline-size: 0;
      min-block-size: 0;
      max-block-size: min(30dvh, 16rem);
      background: var(--agui-surface);
      border-block-end: 1px solid var(--agui-divider);
    }
    .agui-sidebar-heading {
      display: flex;
      align-items: center;
      gap: .5rem;
      min-inline-size: 0;
      padding: .5rem;
    }
    .agui-sidebar-heading > span {
      overflow-wrap: anywhere;
    }
    .agui-sidebar-content {
      min-block-size: 0;
      overflow: auto;
      overscroll-behavior: contain;
      padding: 1rem;
    }
    .agui-sidebar-content[hidden] {
      display: none;
    }
    @media (width >= 64rem) {
      agui-sidebar {
        inline-size: var(--agui-sidebar-width);
        max-inline-size: 35vw;
        max-block-size: none;
        border-block-end: 0;
        border-inline-end: 1px solid var(--agui-divider);
      }
      agui-sidebar[side='end'] {
        border-inline-end: 0;
        border-inline-start: 1px solid var(--agui-divider);
      }
      agui-sidebar[data-expanded='false'] {
        inline-size: calc(var(--agui-control-height) + 1rem);
      }
    }
  }
`;
