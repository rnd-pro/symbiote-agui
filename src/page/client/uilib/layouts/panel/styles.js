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
  }
`;
