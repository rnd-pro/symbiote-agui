import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-list,
    .agui-list-items {
      display: grid;
      min-inline-size: 0;
      gap: 1rem;
    }
    agui-list-item {
      display: block;
      min-inline-size: 0;
    }
    .agui-list-item {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      align-items: start;
      gap: .75rem;
      block-size: 100%;
      border-radius: var(--agui-radius-inset);
    }
    .agui-list-item:has(> agui-field:not([hidden])) {
      grid-template-columns: auto minmax(0, 1fr);
    }
    .agui-list-item > agui-component {
      display: block;
      min-inline-size: 0;
      grid-column: -2 / -1;
    }
    .agui-list-item[data-selectable] {
      cursor: pointer;
    }
    .agui-list-item[data-selected],
    .agui-list-item:focus-visible {
      outline: 2px solid var(--agui-accent);
      outline-offset: 2px;
    }
  }
`;
