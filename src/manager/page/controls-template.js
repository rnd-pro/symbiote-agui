import { html } from '@symbiotejs/symbiote/core/html.js';

export let SESSION_CONTROLS_TEMPLATE = html`
  <section class="grid gap-4" aria-label="Session actions" bind="@data-session: ^sessionId; @data-state: ^statusKind">
    <div class="grid min-w-0 gap-1 break-words [overflow-wrap:anywhere]">
      <h2 class="font-semibold">{{^title}}</h2>
      <code class="text-xs text-agui-muted">/{{^sessionId}}</code>
      <p class="text-xs text-agui-muted">{{^details}}</p>
    </div>
    <p class="error text-sm text-agui-danger">{{^error}}</p>
    <section class="grid gap-2" aria-label="Session lifecycle">
      <h3 class="text-xs uppercase tracking-widest text-agui-muted">Session</h3>
      <agui-toolbar aria-label="Start or stop session" class="grid grid-cols-2">
        <button type="button" class="agui-button-primary" bind="onclick: ^start; disabled: ^startDisabled"><agui-icon name="arrow_forward"></agui-icon>Start</button>
        <button type="button" bind="onclick: ^stop; disabled: ^stopDisabled"><agui-icon name="cancel"></agui-icon>Stop</button>
      </agui-toolbar>
      <agui-toolbar aria-label="Session definition" class="grid grid-cols-2">
        <button type="button" bind="onclick: ^sync; disabled: ^syncDisabled"><agui-icon name="sync"></agui-icon>Sync</button>
        <button type="button" title="Save or export browser drafts and stop the session before renaming it." bind="onclick: ^rename; disabled: ^renameDisabled"><agui-icon name="edit"></agui-icon>Rename</button>
      </agui-toolbar>
    </section>
    <section class="grid gap-2 border-t border-agui-divider pt-3" aria-label="Session links" bind="hidden: ^noLocal">
      <h3 class="text-xs uppercase tracking-widest text-agui-muted">Open page</h3>
      <agui-toolbar aria-label="Open session page" class="grid grid-cols-2">
        <button type="button" aria-label="Public link"
          bind="onclick: ^openPublic; title: ^userUrl; hidden: ^noPublic; disabled: ^publicDisabled"><agui-icon name="open_in_new"></agui-icon>Public</button>
        <a class="agui-button no-underline" target="_blank" rel="noopener noreferrer" aria-label="Local page"
          bind="href: ^url; title: ^url; hidden: ^noLocal"><agui-icon name="open_in_new"></agui-icon>Local</a>
      </agui-toolbar>
    </section>
    <section class="grid gap-2 border-t border-agui-divider pt-3" aria-label="Public tunnel">
      <h3 class="text-xs uppercase tracking-widest text-agui-muted">Public tunnel</h3>
      <p class="text-xs text-agui-muted">{{^tunnel}}</p>
      <agui-toolbar aria-label="Attach public tunnel" class="grid grid-cols-1">
        <button type="button" class="agui-button-primary" bind="onclick: ^share; disabled: ^shareDisabled; title: ^shareHint"><agui-icon name="open_in_new"></agui-icon>{{^shareLabel}}</button>
      </agui-toolbar>
      <agui-toolbar aria-label="Tunnel maintenance" class="grid grid-cols-2">
        <button type="button" aria-label="Check tunnel" title="Check tunnel" bind="onclick: ^check; disabled: ^tunnelDisabled"><agui-icon name="check_circle"></agui-icon>Check</button>
        <button type="button" aria-label="Renew tunnel" title="Renew tunnel" bind="onclick: ^renew; disabled: ^tunnelDisabled"><agui-icon name="refresh"></agui-icon>Renew</button>
      </agui-toolbar>
    </section>
    <section class="grid gap-2 border-t border-agui-divider pt-3" aria-label="Manage session">
      <h3 class="text-xs uppercase tracking-widest text-agui-muted">Manage</h3>
      <agui-toolbar aria-label="Session information and feedback" class="grid grid-cols-2">
        <button type="button" bind="onclick: ^describe; disabled: ^describeDisabled"><agui-icon name="info"></agui-icon>Description</button>
        <button type="button" aria-label="Feedback command" title="Feedback command" aria-haspopup="dialog" bind="onclick: ^feedback; disabled: ^feedbackDisabled"><agui-icon name="settings"></agui-icon>Feedback</button>
      </agui-toolbar>
      <agui-toolbar aria-label="Transfer session to project" class="grid grid-cols-2">
        <button type="button" aria-label="Copy to project" title="Copy to project" bind="onclick: ^copy; disabled: ^copyDisabled"><agui-icon name="content_copy"></agui-icon>Copy</button>
        <button type="button" aria-label="Move to project" title="Save or export browser drafts and stop the session before moving it." bind="onclick: ^move; disabled: ^moveDisabled"><agui-icon name="arrow_forward"></agui-icon>Move</button>
      </agui-toolbar>
    </section>
    <agui-toolbar aria-label="Clear session" class="grid grid-cols-1 border-t border-agui-divider pt-3">
      <button type="button" class="agui-button-danger" bind="onclick: ^clear; disabled: ^clearDisabled"><agui-icon name="delete"></agui-icon>Clear</button>
    </agui-toolbar>
  </section>
`;
