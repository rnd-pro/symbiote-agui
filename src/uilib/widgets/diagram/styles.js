import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-diagram {
      display: grid;
      min-inline-size: 0;
      gap: .75rem;
    }
    agui-diagram figure {
      display: grid;
      min-inline-size: 0;
      gap: .5rem;
      margin: 0;
    }
    .agui-diagram-plot {
      min-inline-size: 0;
      max-block-size: var(--agui-diagram-max-height, 40rem);
      overflow: auto;
    }
    .agui-diagram-plot > svg {
      --pele-bg: var(--agui-bg);
      --pele-fg: var(--agui-text);
      --pele-muted: var(--agui-muted);
      --pele-line: var(--agui-muted);
      --pele-surface: var(--agui-surface);
      --pele-surface-alt: var(--agui-raised);
      --pele-border: var(--agui-border-hover);
      --pele-accent: var(--agui-accent);
      --pele-font: var(--font-sans, sans-serif);
      --pele-font-mono: monospace;
      --pele-radius: var(--agui-radius-control);
      --pele-series-1: var(--agui-accent);
      --pele-series-2: var(--agui-success);
      --pele-series-3: var(--agui-warning);
      --pele-series-4: var(--agui-danger);
      display: block;
      max-inline-size: 100%;
    }
  }
`;
