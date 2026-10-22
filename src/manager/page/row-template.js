import { html } from '@symbiotejs/symbiote/core/html.js';

export let SESSION_ROW_TEMPLATE = html`
  <agui-panel role="article" class="grid gap-3" bind="@data-session: ^sessionId; @data-state: ^statusKind">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 break-words [overflow-wrap:anywhere]">
        <h3 class="font-semibold">{{^title}}</h3>
        <code class="text-xs text-agui-muted">/{{^sessionId}}</code>
      </div>
      <span class="session-status">{{^status}}</span>
    </div>
    <p class="break-words text-sm [overflow-wrap:anywhere]">{{^summary}}</p>
    <p class="data-flow break-words text-sm text-agui-muted empty:hidden [overflow-wrap:anywhere]">{{^dataFlow}}</p>
    <p class="text-xs leading-6 text-agui-muted">{{^details}}</p>
    <p class="text-xs leading-6 text-agui-muted">{{^tunnel}}</p>
    <p class="error text-sm text-agui-danger">{{^error}}</p>
    <div class="flex flex-wrap gap-x-5 gap-y-3 text-sm">
      <a class="inline-flex items-center gap-2" target="_blank" rel="noopener noreferrer" bind="href: ^url; hidden: ^noLocal"><agui-icon name="open_in_new"></agui-icon>Open local page</a>
      <a class="inline-flex items-center gap-2" target="_blank" rel="noopener noreferrer" bind="href: ^userUrl; hidden: ^noPublic"><agui-icon name="person"></agui-icon>Public user page</a>
      <a class="inline-flex items-center gap-2" target="_blank" rel="noopener noreferrer" bind="href: ^viewerUrl; hidden: ^noPublic"><agui-icon name="dashboard"></agui-icon>Viewer page</a>
    </div>
    <agui-toolbar aria-label="Session actions" class="border-t border-agui-border pt-3">
      <button type="button" class="agui-button-primary" bind="onclick: ^start; disabled: ^startDisabled"><agui-icon name="arrow_forward"></agui-icon>Start</button>
      <button type="button" bind="onclick: ^stop; disabled: ^stopDisabled"><agui-icon name="cancel"></agui-icon>Stop</button>
      <button type="button" bind="onclick: ^sync; disabled: ^syncDisabled"><agui-icon name="sync"></agui-icon>Sync</button>
      <button type="button" class="agui-button-primary" bind="onclick: ^share; disabled: ^shareDisabled; title: ^shareHint"><agui-icon name="open_in_new"></agui-icon>{{^shareLabel}}</button>
      <button type="button" bind="onclick: ^check; disabled: ^tunnelDisabled"><agui-icon name="check_circle"></agui-icon>Check tunnel</button>
      <button type="button" bind="onclick: ^renew; disabled: ^tunnelDisabled"><agui-icon name="refresh"></agui-icon>Renew tunnel</button>
      <button type="button" bind="onclick: ^describe; disabled: ^describeDisabled"><agui-icon name="info"></agui-icon>Description</button>
      <button type="button" class="agui-button-danger" bind="onclick: ^clear; disabled: ^clearDisabled"><agui-icon name="delete"></agui-icon>Clear</button>
    </agui-toolbar>
  </agui-panel>
`;
