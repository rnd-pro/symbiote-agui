import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-app {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto auto minmax(0, 1fr) auto auto auto;
      box-sizing: border-box;
      block-size: var(--agui-app-height, 100dvh);
      min-inline-size: 0;
      overflow: clip;
    }
    agui-app > agui-header,
    agui-app > [slot='header'] {
      grid-column: 1;
      grid-row: 1;
    }
    agui-app > agui-sidebar {
      grid-column: 1;
      grid-row: 2;
    }
    agui-app > agui-viewport {
      grid-column: 1;
      grid-row: 3;
    }
    agui-app > agui-sidebar[side='end'] {
      grid-row: 4;
    }
    agui-app > [slot='footer'] {
      grid-column: 1;
      grid-row: 5;
    }
    agui-app > agui-data-toolbar {
      grid-column: 1;
      grid-row: 6;
    }
    @media (width >= 64rem) {
      agui-app {
        grid-template-columns: auto minmax(0, 1fr) auto;
        grid-template-rows: auto minmax(0, 1fr) auto auto;
      }
      agui-app > agui-header,
      agui-app > [slot='header'] {
        grid-column: 1 / -1;
      }
      agui-app > agui-viewport {
        grid-column: 2;
        grid-row: 2;
      }
      agui-app > agui-sidebar[side='end'] {
        grid-column: 3;
        grid-row: 2;
      }
      agui-app > [slot='footer'] {
        grid-column: 1 / -1;
        grid-row: 3;
      }
      agui-app > agui-data-toolbar {
        grid-column: 1 / -1;
        grid-row: 4;
      }
    }
  }
`;
