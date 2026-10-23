import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-kanban {
      display: grid;
      min-inline-size: 0;
      gap: 1rem;
    }
    agui-kanban-column,
    agui-kanban-card {
      display: contents;
    }
    .agui-kanban-scroll {
      min-inline-size: 0;
      max-inline-size: 100%;
      overflow: auto;
    }
    .agui-kanban-scroll:focus-visible {
      outline: 2px solid var(--agui-accent);
      outline-offset: 2px;
    }
    .agui-kanban-columns,
    .agui-kanban-cards {
      display: grid;
      align-content: start;
      gap: 1rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .agui-kanban-columns {
      grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--agui-kanban-column-width, 16rem)), 1fr));
      align-items: stretch;
      grid-auto-rows: 1fr;
    }
    .agui-kanban-column {
      display: grid;
      min-inline-size: 0;
      align-content: start;
      gap: 1rem;
      padding: 1rem;
      border: 1px solid var(--agui-divider);
      border-radius: var(--agui-radius-panel);
      background: var(--agui-bg);
    }
    .agui-kanban-column-heading {
      display: flex;
      align-items: center;
      gap: .5rem;
      overflow-wrap: anywhere;
      font-weight: 400;
    }
    .agui-kanban-card {
      display: grid;
      min-inline-size: 0;
      gap: .75rem;
      padding: 1rem;
      border: 1px solid var(--agui-divider);
      border-radius: var(--agui-radius-inset);
      background: var(--agui-surface);
      box-shadow: var(--agui-shadow-panel);
      overflow-wrap: anywhere;
    }
    .agui-kanban-card h4 {
      font-weight: 400;
    }
    .agui-kanban-description,
    .agui-kanban-hint,
    .agui-kanban-empty {
      font-size: .875rem;
      color: var(--agui-muted);
    }
    .agui-kanban-card[draggable='true'] {
      cursor: grab;
    }
    .agui-kanban-card[data-dragging] {
      cursor: grabbing;
      opacity: .5;
    }
    .agui-kanban-card:focus-visible {
      outline: 2px solid var(--agui-accent);
      outline-offset: 2px;
    }
    .agui-kanban-column[data-drop-target] {
      border-color: var(--agui-accent);
      background: var(--agui-accent-soft);
    }
  }
`;
