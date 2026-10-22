import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-header {
      --agui-header-gutter: calc(var(--spacing, .25rem) * 4);
      display: flex;
      width: 100%;
      min-width: 0;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: calc(var(--spacing, .25rem) * 3);
      padding-block: calc(var(--spacing, .25rem) * 3);
      padding-inline: max(var(--agui-header-gutter), calc((100% - var(--container-7xl, 80rem)) / 2 + var(--agui-header-gutter)));
      /** background-color: var(--agui-bg);*/
      backdrop-filter: blur(14px);
    }
    agui-header h1 {
      font-size: var(--text-xl, 1.25rem);
      line-height: var(--text-xl--line-height, 1.4);
      font-weight: var(--font-weight-semibold, 600);
    }
    agui-header[floating] {
      position: sticky;
      z-index: 20;
      top: var(--agui-header-offset);
      border-bottom: 1px solid var(--agui-border);
    }
    @media (width >= 40rem) {
      agui-header { --agui-header-gutter: calc(var(--spacing, .25rem) * 6); }
      agui-header h1 {
        font-size: var(--text-2xl, 1.5rem);
        line-height: var(--text-2xl--line-height, 1.3333333333);
      }
    }
  }
`;
