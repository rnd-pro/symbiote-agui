import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-chart,
    agui-chart-data {
      display: grid;
      min-inline-size: 0;
      gap: 1rem;
    }
    agui-chart figure {
      display: grid;
      min-inline-size: 0;
      gap: .5rem;
      margin: 0;
    }
    agui-chart figcaption {
      font-weight: 400;
    }
    .agui-chart-description {
      color: var(--agui-muted);
      font-size: .875rem;
    }
    .agui-chart-plot {
      min-inline-size: 0;
      block-size: var(--agui-chart-height, 18rem);
    }
    agui-chart agui-chart-data {
      margin-block-start: 1rem;
    }
  }
`;
