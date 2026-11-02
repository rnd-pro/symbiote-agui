import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-list {
      display: block;
      min-inline-size: 0;
    }
    agui-list > .agui-list-items {
      display: contents;
    }
    agui-list[data-message]:not([data-message=''])::before {
      content: attr(data-message);
      grid-column: 1 / -1;
    }
  }
`;
