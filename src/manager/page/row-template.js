export let SESSION_ROW_TEMPLATE = `
  <agui-panel role="article" class="grid gap-3" bind="@data-session: ^sessionId; @data-state: ^statusKind">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 break-words [overflow-wrap:anywhere]">
        <h3 class="font-semibold">{{^title}}</h3>
        <code class="text-xs text-agui-muted">/{{^sessionId}}</code>
      </div>
      <span class="session-status">{{^status}}</span>
    </div>
    <p class="break-words text-sm [overflow-wrap:anywhere]">{{^summary}}</p>
    <p class="text-xs leading-6 text-agui-muted">{{^details}}</p>
    <p class="text-xs leading-6 text-agui-muted">{{^tunnel}}</p>
    <p class="error text-sm text-agui-danger">{{^error}}</p>
    <div class="flex flex-wrap gap-x-5 gap-y-3 text-sm">
      <a target="_blank" rel="noopener noreferrer" bind="href: ^url; hidden: ^noLocal">Open local page</a>
      <a target="_blank" rel="noopener noreferrer" bind="href: ^userUrl; hidden: ^noPublic">Public user page</a>
      <a target="_blank" rel="noopener noreferrer" bind="href: ^viewerUrl; hidden: ^noPublic">Viewer page</a>
    </div>
    <agui-toolbar aria-label="Session actions" class="border-t border-agui-border pt-3">
      <button type="button" class="agui-button-primary" bind="onclick: ^start; disabled: ^startDisabled">Start</button>
      <button type="button" bind="onclick: ^stop; disabled: ^stopDisabled">Stop</button>
      <button type="button" bind="onclick: ^sync; disabled: ^syncDisabled">Sync</button>
      <button type="button" class="agui-button-primary" bind="onclick: ^share; disabled: ^shareDisabled; title: ^shareHint">{{^shareLabel}}</button>
      <button type="button" bind="onclick: ^check; disabled: ^tunnelDisabled">Check tunnel</button>
      <button type="button" bind="onclick: ^renew; disabled: ^tunnelDisabled">Renew tunnel</button>
      <button type="button" bind="onclick: ^describe; disabled: ^describeDisabled">Description</button>
      <button type="button" class="agui-button-danger" bind="onclick: ^clear; disabled: ^clearDisabled">Clear</button>
    </agui-toolbar>
  </agui-panel>
`;
