import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-toolbar {
      display: flex;
      min-width: 0;
      flex-wrap: wrap;
      align-items: start;
      gap: calc(var(--spacing, .25rem) * 3);
    }
    agui-toolbar > agui-field,
    agui-toolbar > agui-select {
      min-width: 0;
      flex-grow: 1;
      flex-basis: calc(var(--spacing, .25rem) * 48);
    }
  }
`;
