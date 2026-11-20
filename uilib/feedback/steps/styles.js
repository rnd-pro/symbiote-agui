import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-steps {
      display: block;
      min-inline-size: 0;
      overflow: auto;
    }
    agui-steps ol {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(8rem, 1fr);
      list-style: none;
      padding: 0;
      margin: 0;
    }
    agui-steps li {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .5rem;
      padding-inline: .5rem;
      color: var(--agui-muted);
      text-align: center;
    }
    agui-steps li::before {
      content: '';
      position: absolute;
      inset-block-start: calc(var(--agui-control-height) / 2);
      inset-inline-start: calc(-50% + var(--agui-control-height) / 2 + .5rem);
      inline-size: calc(100% - var(--agui-control-height) - 1rem);
      border-block-start: 2px dashed var(--agui-border);
    }
    agui-steps ol > :first-child > li::before {
      content: none;
    }
    .agui-step-marker {
      display: grid;
      place-items: center;
      flex: none;
      inline-size: var(--agui-control-height);
      block-size: var(--agui-control-height);
      border: 1px solid var(--agui-border);
      border-radius: 50%;
      background: var(--agui-surface);
      font-size: .875rem;
    }
    .agui-step-label {
      max-inline-size: 100%;
      overflow-wrap: anywhere;
      font-size: .875rem;
    }
    agui-steps li[data-state='completed'],
    agui-steps li[data-state='current'] {
      color: var(--agui-accent);
    }
    agui-steps li[data-state='completed']::before,
    agui-steps li[data-state='current']::before {
      border-color: var(--agui-accent);
      border-block-start-style: solid;
    }
    agui-steps li[data-state='current'] .agui-step-marker {
      border: 2px solid var(--agui-accent);
      background: var(--agui-accent-soft);
    }
    agui-steps li[data-state='completed'] .agui-step-marker {
      border-color: var(--agui-accent);
      background: var(--agui-accent);
      color: var(--agui-on-accent);
    }
  }
`;
