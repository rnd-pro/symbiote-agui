import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-sidebar-block {
      display: block;
      min-inline-size: 0;
      border-block-end: 1px solid var(--agui-divider);
      padding-top: .5rem;
      padding-bottom: 1rem;

      &:first-of-type {
        padding-top: 0;
      }

      &:last-of-type {
        border: none;
      }

      > fieldset {
        min-inline-size: 0;
        margin: 0;
        border: 0;
        padding: 0;

        > legend {
          max-inline-size: 100%;
          padding: 0;
          overflow-wrap: anywhere;
          color: var(--agui-muted);
          font-size: var(--text-xs, .75rem);
          line-height: var(--text-xs--line-height, 1.3333333333);
          font-weight: var(--font-weight-medium, 500);
          letter-spacing: var(--tracking-wider, .05em);
          text-transform: uppercase;
        }

        > div {
          display: grid;
          gap: calc(var(--spacing, .25rem) * 3);
          margin-block-start: calc(var(--spacing, .25rem) * 2);
        }

        > div[hidden] {
          display: none;
        }
      }

      &[data-active='false'] > fieldset > legend {
        opacity: .5;
        pointer-events: none;
        user-select: none;
      }
    }
    @media (prefers-reduced-motion: no-preference) {
      agui-sidebar-block > fieldset > legend {
        transition-property: color, opacity;
        transition-duration: var(--agui-motion-fast);
        transition-timing-function: var(--agui-motion-ease);
      }
    }
  }
`;
