import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-dialog {
      display: block;
      min-inline-size: 0;
    }
    .agui-dialog-surface {
      inline-size: min(var(--agui-dialog-width, 36rem), calc(100vw - 2rem));
      max-inline-size: calc(100vw - 2rem);
      max-block-size: calc(100dvh - 2rem);
      overflow: auto;
      margin: auto;
      padding: var(--agui-panel-padding);
      border: 1px solid var(--agui-border);
      border-radius: var(--agui-radius-panel);
      background: var(--agui-surface);
      color: var(--agui-text);
      box-shadow: var(--agui-shadow-floating);
    }
    .agui-dialog-surface[open] {
      display: grid;
      gap: 1rem;
    }
    .agui-dialog-surface::backdrop {
      background: rgb(0 0 0 / .5);
    }
    .agui-dialog-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .agui-dialog-heading h2 {
      min-inline-size: 0;
      overflow-wrap: anywhere;
      font-size: 1.125rem;
    }
    .agui-dialog-content {
      display: grid;
      min-inline-size: 0;
      gap: 1rem;
    }
  }
`;
