import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-conditional,
    .agui-conditional-content {
      display: contents;
    }
    agui-conditional[hidden] {
      display: none;
    }
  }
`;
