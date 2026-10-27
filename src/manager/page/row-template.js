import { html } from '@symbiotejs/symbiote/core/html.js';

export let SESSION_ROW_TEMPLATE = html`
  <agui-panel role="article" class="grid gap-3" bind="@data-session: ^sessionId; @data-state: ^statusKind; @data-selected: ^selectedText; onclick: ^selectCard">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 break-words [overflow-wrap:anywhere]">
        <h3><button type="button" class="manager-session-select" bind="onclick: ^select; @aria-pressed: ^selectedText; @aria-label: ^selectLabel">{{^title}}</button></h3>
        <code class="text-xs text-agui-muted">/{{^sessionId}}</code>
      </div>
      <span class="session-status agui-chip">{{^status}}</span>
    </div>
    <details>
      <summary>Summary</summary>
      <div class="mt-3 grid gap-3">
        <p class="break-words text-sm [overflow-wrap:anywhere]">{{^summary}}</p>
        <p class="data-flow break-words text-sm text-agui-muted empty:hidden [overflow-wrap:anywhere]">{{^dataFlow}}</p>
      </div>
    </details>
    <p class="text-xs leading-6 text-agui-muted">{{^details}}</p>
    <p class="text-xs leading-6 text-agui-muted">{{^tunnel}}</p>
    <p class="error text-sm text-agui-danger">{{^error}}</p>
    <div class="flex flex-wrap gap-x-5 gap-y-3 text-sm">
      <a class="inline-flex items-center gap-2" target="_blank" rel="noopener noreferrer" bind="href: ^url; hidden: ^noLocal"><agui-icon name="open_in_new"></agui-icon>Open local page</a>
      <button type="button" aria-label="Public link" bind="onclick: ^openPublic; title: ^userUrl; hidden: ^noPublic; disabled: ^publicDisabled"><agui-icon name="person"></agui-icon>Public page</button>
      <button type="button" aria-label="Viewer page" bind="onclick: ^openViewer; title: ^viewerUrl; hidden: ^noPublic; disabled: ^publicDisabled"><agui-icon name="dashboard"></agui-icon>Viewer page</button>
    </div>

  </agui-panel>
`;
