import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    :is(agui-list, agui-explorer) {
      display: block;
      min-inline-size: 0;
    }
    :is(agui-list, agui-explorer) > .agui-list-items {
      display: contents;
    }
    :is(agui-list, agui-explorer) > .agui-list-items > * {
      /* Itemize reuses structural hosts; pending exit timers must not remove reused items. */
      transition: none;
    }
    :is(agui-list, agui-explorer)[data-message]:not([data-message=''])::before {
      content: attr(data-message);
      grid-column: 1 / -1;
    }
  }
`;
