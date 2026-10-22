import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-state { display: block; min-width: 0; }
    agui-state [role='alert'] { border-color: var(--agui-danger); color: var(--agui-danger); }
  }
`;
