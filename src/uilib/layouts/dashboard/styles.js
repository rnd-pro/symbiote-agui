import {
  css,
} from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-dashboard {
      display: grid;
      width: 100%;
      min-width: 0;
      max-width: var(--agui-content-width);
      margin-inline: auto;
      grid-template-columns: minmax(0, 1fr);
      gap: calc(var(--spacing, .25rem) * 4);
      padding: calc(var(--spacing, .25rem) * 4);
      font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif);
      font-size: var(--text-base, 1rem);
      line-height: var(--text-base--line-height, 1.5);
    }
    agui-dashboard[density='compact'] {
      --agui-panel-padding: 1rem;
    }
    agui-dashboard > agui-header,
    agui-dashboard > agui-toolbar,
    agui-dashboard > [slot='full'] {
      grid-column: 1 / -1;
    }
    @media (width >= 40rem) {
      agui-dashboard {
        gap: calc(var(--spacing, .25rem) * 6);
        padding: calc(var(--spacing, .25rem) * 6);
      }
    }
    @media (width >= 48rem) {
      agui-dashboard:is([layout='equal'], [layout='grid']) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (width >= 64rem) {
      agui-dashboard[layout='split'] {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      agui-dashboard[layout='split'] > [slot='main'] {
        grid-column: span 2 / span 2;
      }
    }
    @media (width >= 80rem) {
      agui-dashboard[layout='grid'] {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
  }
`;
