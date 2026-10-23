import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-table {
      display: grid;
      min-inline-size: 0;
      gap: 1rem;
    }
    agui-table-heading,
    agui-table-row,
    agui-table-cell {
      display: contents;
    }
    .agui-table-scroll {
      min-inline-size: 0;
      max-inline-size: 100%;
      max-block-size: var(--agui-table-height, 32rem);
      overflow: auto;
      border: 1px solid var(--agui-divider);
      border-radius: var(--agui-radius-inset);
    }
    .agui-table-scroll:focus-visible {
      outline: 2px solid var(--agui-accent);
      outline-offset: 2px;
    }
    .agui-table-scroll table {
      inline-size: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: .875rem;
    }
    .agui-table-scroll caption {
      padding: .75rem;
      text-align: start;
      color: var(--agui-muted);
    }
    .agui-table-scroll th,
    .agui-table-scroll td {
      height: var(--agui-control-height);
      padding: 0 .75rem;
      border-block-end: 1px solid var(--agui-divider);
      text-align: start;
      vertical-align: middle;
      white-space: nowrap;
      max-inline-size: 32rem;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .agui-table-scroll td > input:not([hidden]) {
      display: block;
    }
    .agui-table-scroll th {
      position: sticky;
      inset-block-start: 0;
      z-index: 1;
      background: var(--agui-surface);
      font-weight: 400;
    }
    .agui-table-scroll tbody tr:hover {
      background: var(--agui-hover);
    }
    .agui-table-heading-content {
      display: flex;
      align-items: center;
      gap: .5rem;
    }
    .agui-table-sort {
      height: auto;
      min-height: var(--agui-control-height);
      border-color: transparent;
      background: transparent;
      padding: .25rem;
    }
    .agui-table-sort:hover:enabled {
      border-color: transparent;
    }
    .agui-table-footer {
      display: grid;
      gap: .75rem;
      font-size: .875rem;
    }
    .agui-table-pagination {
      display: flex;
      align-items: center;
      justify-content: start;
      flex-wrap: wrap;
      gap: .75rem;
      font-size: .875rem;
    }
    .agui-table-page {
      display: inline-flex;
      align-items: center;
      gap: .25rem;
      min-block-size: var(--agui-control-height);
    }
    .agui-table-footer p {
      color: var(--agui-muted);
    }
  }
`;
