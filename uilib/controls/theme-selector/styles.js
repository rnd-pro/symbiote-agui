import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-theme-selector {
      display: inline-block;
    }
    .agui-theme-panel {
      inline-size: 18rem;
    }
    .agui-theme-option {
      inline-size: 100%;
      justify-content: flex-start;
      gap: .75rem;
    }
    .agui-theme-option[aria-pressed='true'] {
      border-color: var(--agui-accent);
      color: var(--agui-accent);
    }
    .agui-theme-option > agui-icon {
      margin-inline-start: auto;
    }
    .agui-theme-preview {
      display: flex;
      gap: .2rem;
    }
    .agui-theme-preview > span {
      inline-size: .875rem;
      block-size: .875rem;
      border: 1px solid var(--agui-border);
      border-radius: .2rem;
      background: var(--agui-bg);
    }
    .agui-theme-preview > span:nth-child(2) {
      background: var(--agui-text);
    }
    .agui-theme-preview > span:nth-child(3) {
      background: var(--agui-accent);
    }
  }
`;
