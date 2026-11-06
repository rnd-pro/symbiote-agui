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
        <agui-button type="button" class="agui-button-primary" bind="onclick: ^start; @disabled: ^startDisabled"><agui-icon name="play_arrow"></agui-icon>Start</agui-button>
        <agui-button type="button" bind="onclick: ^stop; @disabled: ^stopDisabled"><agui-icon name="stop"></agui-icon>Stop</agui-button>
      </agui-toolbar>
      <agui-toolbar aria-label="Session definition" class="grid grid-cols-2">
        <agui-button type="button" bind="onclick: ^sync; @disabled: ^syncDisabled"><agui-icon name="sync"></agui-icon>Sync</agui-button>
        <agui-button type="button" title="Save or export browser drafts and stop the session before renaming it." bind="onclick: ^rename; @disabled: ^renameDisabled"><agui-icon name="edit"></agui-icon>Rename</agui-button>
      </agui-toolbar>
    </section>
    <section class="grid gap-2 border-t border-agui-divider pt-3" aria-label="Session links" bind="hidden: ^noLocal">
      <h3 class="text-xs uppercase tracking-widest text-agui-muted">Open page</h3>
      <agui-toolbar aria-label="Open session page" class="grid grid-cols-2">
        <agui-button type="button" aria-label="Public link"
          bind="onclick: ^openPublic; title: ^userUrl; @hidden: ^noPublic; @disabled: ^publicDisabled"><agui-icon name="public"></agui-icon>Public</agui-button>
        <a class="agui-button no-underline" target="_blank" rel="noopener noreferrer" aria-label="Local page"
          bind="href: ^url; title: ^url; hidden: ^noLocal"><agui-icon name="open_in_new"></agui-icon>Local</a>
      </agui-toolbar>
    </section>
    <section class="grid gap-2 border-t border-agui-divider pt-3" aria-label="Public tunnel">
      <h3 class="text-xs uppercase tracking-widest text-agui-muted">Public tunnel</h3>
      <p class="text-xs text-agui-muted">{{^tunnel}}</p>
      <agui-toolbar aria-label="Attach public tunnel" class="grid grid-cols-1">
        <agui-button type="button" class="agui-button-primary" bind="onclick: ^share; @disabled: ^shareDisabled; title: ^shareHint"><agui-icon name="share"></agui-icon>{{^shareLabel}}</agui-button>
      </agui-toolbar>
      <agui-toolbar aria-label="Tunnel maintenance" class="grid grid-cols-2">
        <agui-button type="button" aria-label="Check tunnel" title="Check tunnel" bind="onclick: ^check; @disabled: ^tunnelDisabled"><agui-icon name="check_circle"></agui-icon>Check</agui-button>
        <agui-button type="button" aria-label="Renew tunnel" title="Renew tunnel" bind="onclick: ^renew; @disabled: ^tunnelDisabled"><agui-icon name="autorenew"></agui-icon>Renew</agui-button>
      </agui-toolbar>
    </section>
    <section class="grid gap-2 border-t border-agui-divider pt-3" aria-label="Manage session">
      <h3 class="text-xs uppercase tracking-widest text-agui-muted">Manage</h3>
      <agui-toolbar aria-label="Session information and feedback" class="grid grid-cols-2">
        <agui-button type="button" bind="onclick: ^describe; @disabled: ^describeDisabled"><agui-icon name="description"></agui-icon>Description</agui-button>
        <agui-button type="button" aria-label="Feedback command" title="Feedback command" aria-haspopup="dialog" bind="onclick: ^feedback; @disabled: ^feedbackDisabled"><agui-icon name="chat"></agui-icon>Feedback</agui-button>
      </agui-toolbar>
      <agui-toolbar aria-label="Transfer session to project" class="grid grid-cols-2">
        <agui-button type="button" aria-label="Copy to project" title="Copy to project" bind="onclick: ^copy; @disabled: ^copyDisabled"><agui-icon name="content_copy"></agui-icon>Copy</agui-button>
        <agui-button type="button" aria-label="Move to project" title="Save or export browser drafts and stop the session before moving it." bind="onclick: ^move; @disabled: ^moveDisabled"><agui-icon name="drive_file_move"></agui-icon>Move</agui-button>
      </agui-toolbar>
      <agui-toolbar aria-label="Local connector backends" class="grid grid-cols-1">
        <agui-button type="button" aria-label="Connector backends" aria-haspopup="dialog" bind="onclick: ^connectors; @disabled: ^connectorsDisabled"><agui-icon name="cable"></agui-icon>Connectors</agui-button>
      </agui-toolbar>
    </section>
    <agui-toolbar aria-label="Clear session" class="grid grid-cols-1 border-t border-agui-divider pt-3">
      <agui-button type="button" class="agui-button-danger" bind="onclick: ^clear; @disabled: ^clearDisabled"><agui-icon name="delete"></agui-icon>Clear</agui-button>
    </agui-toolbar>
  </section>
`;
