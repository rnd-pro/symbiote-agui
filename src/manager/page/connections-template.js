import { html } from '@symbiotejs/symbiote/core/html.js';

export let CONNECTIONS_TEMPLATE = html`
  <section class="grid min-w-0 gap-4" aria-label="All project connections">
    <agui-toolbar aria-label="Connection discovery">
      <button type="button" bind="onclick: MANAGER/refreshConnections; disabled: MANAGER/connectionsDisabled"><agui-icon name="refresh"></agui-icon>Refresh connections</button>
    </agui-toolbar>
    <p class="text-sm text-agui-muted" role="status" bind="textContent: MANAGER/connectionsMessage"></p>
    <p class="whitespace-pre-wrap break-words text-sm text-agui-danger empty:hidden" role="alert" bind="textContent: MANAGER/connectionsError"></p>
    <div class="grid gap-4" itemize="MANAGER/liveConnectionRows">
      <template>
        <agui-panel class="grid min-w-0 gap-3" bind="@data-connection-session: key">
          <div class="grid min-w-0 gap-1">
            <h3 class="break-words font-semibold">{{^project}} / {{^sessionId}}</h3>
            <p class="break-all text-xs text-agui-muted">{{^path}}</p>
            <p class="text-xs text-agui-muted">{{^details}}</p>
            <p class="text-sm">{{^tunnel}}</p>
            <p class="break-words text-sm text-agui-danger empty:hidden">{{^error}}</p>
          </div>
          <agui-toolbar aria-label="Session connection actions">
            <a class="agui-button no-underline" target="_blank" rel="noopener noreferrer" bind="href: ^url; hidden: ^noLocal"><agui-icon name="open_in_new"></agui-icon>Local</a>
            <button type="button" bind="onclick: ^openPublic; disabled: ^publicDisabled">Public</button>
            <button type="button" bind="onclick: ^openViewer; disabled: ^publicDisabled">Viewer</button>
            <button type="button" bind="onclick: ^check; disabled: ^tunnelDisabled">Check tunnel</button>
            <button type="button" bind="onclick: ^renew; disabled: ^tunnelDisabled">Renew tunnel</button>
            <button type="button" class="agui-button-danger" bind="onclick: ^stop; disabled: ^stopDisabled">Stop tunnel</button>
          </agui-toolbar>
          <div class="grid gap-2" itemize="^pages">
            <template>
              <section class="grid min-w-0 gap-2 border-t border-agui-divider pt-3" bind="@data-browser-connection: id">
                <h4 class="break-words font-medium">{{title}}</h4>
                <p class="text-xs text-agui-muted">{{details}}</p>
                <p class="break-all text-xs">{{url}}</p>
                <agui-toolbar aria-label="Browser connection actions">
                  <button type="button" bind="onclick: ^disconnect; disabled: ^disabled"><agui-icon name="close"></agui-icon>Disconnect browser</button>
                </agui-toolbar>
              </section>
            </template>
          </div>
        </agui-panel>
      </template>
    </div>
  </section>
`;

