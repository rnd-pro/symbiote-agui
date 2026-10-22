import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-panel {
      display: block;
      min-width: 0;
      border-radius: var(--radius-xl, .75rem);
      background-color: var(--agui-surface);
      padding: var(--agui-panel-padding);
      box-shadow: 0 1px 3px rgb(0 0 0 / .06);
    }
    agui-panel > h2 {
      margin-bottom: calc(var(--spacing, .25rem) * 4);
      font-size: var(--text-lg, 1.125rem);
      line-height: var(--text-lg--line-height, 1.5555555556);
      font-weight: var(--font-weight-semibold, 600);
    }
  }
`;
