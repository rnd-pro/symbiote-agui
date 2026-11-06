import { html } from '@symbiotejs/symbiote/core/html.js';

export let CONNECTIONS_TEMPLATE = html`
  <section class="grid min-w-0 gap-4" aria-label="All project connections">
    <agui-toolbar aria-label="Connection discovery">
      <agui-button type="button" bind="onclick: MANAGER/refreshConnections; @disabled: MANAGER/connectionsDisabled"><agui-icon name="refresh"></agui-icon>Refresh connections</agui-button>
    </agui-toolbar>
    <p class="text-sm text-agui-muted" role="status" bind="textContent: MANAGER/connectionsMessage"></p>
    <p class="whitespace-pre-wrap break-words text-sm text-agui-danger empty:hidden" role="alert" bind="textContent: MANAGER/connectionsError"></p>
    <agui-list id="manager-connection-list" class="grid gap-4" label="Connections" selection="single" pub-to="MANAGER/connectionSelection"
      bind="$.items: MANAGER/liveConnectionRows; $.value: MANAGER/connectionSelection; $.texts: MANAGER/connectionListTexts">
      <template>
        <agui-panel selectable role="listitem" class="grid min-w-0 gap-3"
          bind="@data-connection-session: ^sessionKey; @data-browser-connection: ^browserId; @data-selected: ^_selected; ariaDisabled: ^_selectionDisabled">
          <div class="grid min-w-0 gap-1">
            <p class="text-xs text-agui-muted">{{^kindLabel}} / {{^project}} / {{^sessionId}}</p>
            <h3 class="min-w-0"><agui-button class="agui-button-ghost" bind="onclick: ^selectItem; ariaPressed: ^_selected; @disabled: ^_selectionDisabled">{{^title}}</agui-button></h3>
            <p class="break-all text-xs text-agui-muted">{{^path}}</p>
            <p class="text-xs text-agui-muted">{{^details}}</p>
            <p class="text-sm empty:hidden">{{^tunnel}}</p>
            <p class="break-all text-xs text-agui-muted">{{^displayUrl}}</p>
            <p class="break-words text-sm text-agui-danger empty:hidden">{{^error}}</p>
          </div>
        </agui-panel>
      </template>
    </agui-list>
  </section>
`;

