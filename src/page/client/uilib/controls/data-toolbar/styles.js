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
      border-top: 1px solid var(--agui-divider);
      box-shadow: var(--agui-shadow-panel);
    }
    .agui-data-markers {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: .5rem;
      margin-inline-start: auto;
      min-height: var(--agui-control-height);
    }
    html:has(agui-data-toolbar) {
      scroll-padding-bottom: var(--agui-data-toolbar-height, 0px);
    }
    @media (width >= 40rem) {
      .agui-data-bar {
        --agui-data-gutter: 1.5rem;
      }
    }
  }
`;
