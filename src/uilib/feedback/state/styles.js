import {
  css,
} from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-state {
      display: block;
      min-width: 0;
    }
    .agui-state-message {
      border-color: var(--agui-divider);
      border-radius: var(--agui-radius-inset);
      background-color: var(--agui-bg);
    }
    .agui-state-message[aria-busy='true'] {
      border-style: dashed;
    }
    .agui-state-message[role='alert'] {
      border-color: var(--agui-danger);
      background-color: var(--agui-danger-soft);
      color: var(--agui-danger);
    }
  }
`;
