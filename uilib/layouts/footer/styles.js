import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-footer {
      display: flex;
      box-sizing: border-box;
      inline-size: 100%;
      min-inline-size: 0;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: calc(var(--spacing, .25rem) * 2);
      border-block-start: 1px solid var(--agui-border);
      background-color: var(--agui-surface);
      padding-block: calc(var(--spacing, .25rem) * 2);
      padding-inline: calc(var(--spacing, .25rem) * 4);
      color: var(--agui-muted);
      font-size: var(--text-xs, .75rem);
      line-height: var(--text-xs--line-height, 1.3333333333);
    }
  }
`;
