import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-viewport {
      --agui-header-height: 0px;
      display: block;
      min-inline-size: 0;
      min-block-size: 0;
      overflow: auto;
      overscroll-behavior: contain;
    }
    agui-viewport:focus-visible {
      outline: 2px solid var(--agui-accent);
      outline-offset: -2px;
    }
  }
`;
