import { html } from '@symbiotejs/symbiote/core/html.js';

export let SESSION_CONTROLS_TEMPLATE = html`
  <section class="grid gap-4" bind="@data-session: ^sessionId; @data-state: ^statusKind">
    <div class="min-w-0 break-words [overflow-wrap:anywhere]">
      <h2 class="font-semibold">{{^title}}</h2>
      <code class="text-xs text-agui-muted">/{{^sessionId}}</code>
    </div>
    <p class="text-xs text-agui-muted">{{^details}}</p>
    <p class="text-xs text-agui-muted">{{^tunnel}}</p>
    <p class="error text-sm text-agui-danger">{{^error}}</p>
    <agui-toolbar aria-label="Session actions" class="grid grid-cols-1">
      <a class="agui-button no-underline" target="_blank" rel="noopener noreferrer" bind="href: ^url; hidden: ^noLocal"><agui-icon name="open_in_new"></agui-icon>Open page</a>
      <button type="button" class="agui-button-primary" bind="onclick: ^start; disabled: ^startDisabled"><agui-icon name="arrow_forward"></agui-icon>Start</button>
      <button type="button" bind="onclick: ^stop; disabled: ^stopDisabled"><agui-icon name="cancel"></agui-icon>Stop</button>
      <button type="button" bind="onclick: ^sync; disabled: ^syncDisabled"><agui-icon name="sync"></agui-icon>Sync</button>
      <button type="button" class="agui-button-primary" bind="onclick: ^share; disabled: ^shareDisabled; title: ^shareHint"><agui-icon name="open_in_new"></agui-icon>{{^shareLabel}}</button>
      <button type="button" bind="onclick: ^check; disabled: ^tunnelDisabled"><agui-icon name="check_circle"></agui-icon>Check tunnel</button>
      <button type="button" bind="onclick: ^renew; disabled: ^tunnelDisabled"><agui-icon name="refresh"></agui-icon>Renew tunnel</button>
      <button type="button" bind="onclick: ^describe; disabled: ^describeDisabled"><agui-icon name="info"></agui-icon>Description</button>
      <button type="button" aria-haspopup="dialog" bind="onclick: ^feedback; disabled: ^feedbackDisabled"><agui-icon name="settings"></agui-icon>Feedback command</button>
      <button type="button" title="Save or export browser drafts and stop the session before renaming it." bind="onclick: ^rename; disabled: ^renameDisabled"><agui-icon name="edit"></agui-icon>Rename</button>
      <button type="button" bind="onclick: ^copy; disabled: ^copyDisabled"><agui-icon name="content_copy"></agui-icon>Copy to project</button>
      <button type="button" title="Save or export browser drafts and stop the session before moving it." bind="onclick: ^move; disabled: ^moveDisabled"><agui-icon name="arrow_forward"></agui-icon>Move to project</button>
      <button type="button" class="agui-button-danger" bind="onclick: ^clear; disabled: ^clearDisabled"><agui-icon name="delete"></agui-icon>Clear</button>
    </agui-toolbar>
  </section>
`;
