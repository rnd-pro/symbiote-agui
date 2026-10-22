import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-data-toolbar {
      display: block;
      grid-column: 1 / -1;
      min-width: 0;
      height: var(--agui-data-toolbar-height, 0px);
    }
    .agui-data-bar {
      --agui-data-gutter: 1rem;
      position: fixed;
      z-index: 30;
      inset-inline: 0;
      bottom: 0;
      max-width: var(--container-7xl, 80rem);
      margin-inline: auto;
      padding: 1rem;
      padding-inline: max(var(--agui-data-gutter), env(safe-area-inset-left)) max(var(--agui-data-gutter), env(safe-area-inset-right));
      padding-bottom: max(1rem, env(safe-area-inset-bottom));
      border: 1px solid var(--agui-border);
      border-bottom: 0;
      border-radius: .75rem .75rem 0 0;
      background: var(--agui-surface);
      box-shadow: 0 -.25rem 1rem #0001;
    }
    .agui-data-marker {
      display: inline-flex;
      align-items: center;
      min-height: var(--agui-control-height);
      padding-inline: .5rem;
      font-size: .875rem;
      color: var(--agui-muted);
    }
    .agui-data-marker[data-connected='false'] { color: var(--agui-danger); }
    .agui-data-status {
      display: flex;
      flex-wrap: wrap;
      gap: .25rem 1rem;
      margin-top: .5rem;
      color: var(--agui-muted);
      font-size: .875rem;
      overflow-wrap: anywhere;
    }
    .agui-data-status > span:empty { display: none; }
    html:has(agui-data-toolbar) { scroll-padding-bottom: var(--agui-data-toolbar-height, 0px); }
    @media (width >= 40rem) { .agui-data-bar { --agui-data-gutter: 1.5rem; } }
  }
`;
