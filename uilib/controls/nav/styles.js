import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-nav {
      display: block;
      min-inline-size: 0;
    }
    .agui-nav-item {
      position: relative;
    }
    .agui-nav-item[aria-current='page']::before {
      content: '';
      position: absolute;
      inset-inline-end: 6px;
      inset-block: .5rem;
      inline-size: 3px;
      border-radius: 3px;
      background-color: var(--agui-accent);
      pointer-events: none;
    }
  }
`;
