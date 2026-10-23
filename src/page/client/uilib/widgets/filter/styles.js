import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-filter {
      display: grid;
      min-inline-size: 0;
      gap: 1rem;
      font-size: .875rem;
    }
    .agui-filter-query,
    .agui-filter-fields,
    agui-filter-field,
    agui-filter-field fieldset,
    .agui-filter-range label {
      display: grid;
      min-inline-size: 0;
      gap: .25rem;
    }
    .agui-filter-fields {
      gap: 1rem;
    }
    .agui-filter-fields:empty {
      display: none;
    }
    .agui-filter-range {
      display: grid;
      gap: .75rem;
    }
    .agui-filter-range label {
      color: var(--agui-muted);
    }
  }
`;
