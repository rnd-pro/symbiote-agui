import { html } from '@symbiotejs/symbiote/core/html.js';

export const CONNECTOR_SETTINGS_TEMPLATE = html`
  <agui-dialog id="manager-connectors" label="Local connector backends" close-label="Close connectors" pub-to="MANAGER/connectorOpen" bind="$.value: MANAGER/connectorOpen">
    <div class="grid min-w-0 gap-5">
      <h2 class="break-all font-medium">{{MANAGER/connectorSession}}</h2>
      <p class="text-xs text-agui-muted" bind="textContent: MANAGER/connectorRuntime"></p>
      <p class="text-xs text-agui-muted">Only reviewed, explicitly granted local scripts run. Checksums detect changes; they do not sandbox host code. Public clients and viewers cannot call backends.</p>
      <agui-toolbar aria-label="Connector settings">
        <agui-button type="button" aria-label="Refresh settings" bind="onclick: MANAGER/refreshConnectors; @disabled: MANAGER/controlsDisabled"><agui-icon name="refresh"></agui-icon>Refresh settings</agui-button>
      </agui-toolbar>
      <p role="status" class="text-sm empty:hidden" bind="textContent: MANAGER/connectorMessage"></p>
      <p role="alert" class="text-sm text-agui-danger empty:hidden" bind="textContent: MANAGER/connectorError"></p>
      <agui-list class="grid gap-3" label="Attached backend actions" id-key="name" bind="$.items: MANAGER/connectorRows; $.texts: MANAGER/connectorListTexts">
        <template>
          <agui-panel class="grid gap-1 text-sm" process-inner-html="false">
            <h3 class="font-medium">{{name}}</h3><p>{{binding}}</p>
            <code class="break-all text-xs">{{revision}}</code><p>{{access}}</p>
          </agui-panel>
        </template>
      </agui-list>
      <details>
        <summary>Attach a backend action</summary>
        <form class="grid gap-3 pt-3" bind="onsubmit: MANAGER/attachConnector">
          <agui-field label="New action key" name="connectorAction" required required-mark="*" pattern="[a-z][a-z0-9_-]{0,63}" pub-to="MANAGER/connectorNewAction" bind="$.value: MANAGER/connectorNewAction; $.disabled: MANAGER/connectorDisabled"></agui-field>
          <agui-field label="Local registry name or folder" name="connectorRegistry" required required-mark="*" pub-to="MANAGER/connectorRegistry" bind="$.value: MANAGER/connectorRegistry; $.disabled: MANAGER/connectorDisabled"></agui-field>
          <agui-field label="Script address" name="connectorAddress" required required-mark="*" placeholder="example.records.read" pub-to="MANAGER/connectorAddress" bind="$.value: MANAGER/connectorAddress; $.disabled: MANAGER/connectorDisabled"></agui-field>
          <agui-toolbar><agui-button type="submit" bind="@disabled: MANAGER/connectorDisabled">Attach without granting</agui-button></agui-toolbar>
        </form>
      </details>
      <section class="grid gap-3" aria-label="Review and access">
        <agui-select label="Attached action" name="selectedConnector" placeholder="Choose an action" pub-to="MANAGER/connectorAction" bind="$.options: MANAGER/connectorOptions; $.value: MANAGER/connectorAction; $.disabled: MANAGER/connectorDisabled"></agui-select>
        <agui-field label="Review bundle file (optional)" name="connectorPath" placeholder="index.js" pub-to="MANAGER/connectorPath" bind="$.value: MANAGER/connectorPath; $.disabled: MANAGER/connectorActionDisabled"></agui-field>
        <agui-toolbar aria-label="Review attachment">
          <agui-button type="button" aria-label="Review source" bind="onclick: MANAGER/reviewConnector; @disabled: MANAGER/connectorActionDisabled"><agui-icon name="search"></agui-icon>Review source</agui-button>
          <agui-button type="button" aria-label="Update pin / reconnect" bind="onclick: MANAGER/updateConnector; @disabled: MANAGER/connectorActionDisabled"><agui-icon name="sync"></agui-icon>Update pin / reconnect</agui-button>
        </agui-toolbar>
        <p class="text-xs text-agui-muted">Update resolves the current address and revokes changed authority. An optional registry folder above reconnects a moved source. Prepare new revisions in Agent Connectors before granting.</p>
        <agui-markdown label="Connector description" bind="$.value: MANAGER/connectorDescription; $.extensions: MANAGER/descriptionExtensions; $.texts: MANAGER/descriptionTexts"></agui-markdown>
        <p class="break-all text-xs" bind="textContent: MANAGER/connectorRevision"></p>
        <pre class="overflow-auto"><code id="connector-source" bind="textContent: MANAGER/connectorSourceCode"></code></pre>
        <details><summary>Contract and bundle hashes</summary><pre class="overflow-auto text-xs"><code bind="textContent: MANAGER/connectorContract"></code></pre></details>
        <agui-select label="Invocation source" name="connectorSource" pub-to="MANAGER/connectorSource" bind="$.value: MANAGER/connectorSource; $.options: MANAGER/connectorSourceOptions; $.disabled: MANAGER/connectorActionDisabled"></agui-select>
        <agui-field label="Private credential profile (optional)" name="connectorProfile" pub-to="MANAGER/connectorProfile" bind="$.value: MANAGER/connectorProfile; $.disabled: MANAGER/connectorActionDisabled"></agui-field>
        <agui-toolbar aria-label="Connector access">
          <agui-button type="button" class="agui-button-primary" bind="onclick: MANAGER/grantConnector; @disabled: MANAGER/connectorGrantDisabled">Grant reviewed revision</agui-button>
          <agui-button type="button" bind="onclick: MANAGER/revokeConnector; @disabled: MANAGER/connectorActionDisabled">Revoke access</agui-button>
          <agui-button type="button" class="agui-button-danger" bind="onclick: MANAGER/detachConnector; @disabled: MANAGER/connectorActionDisabled">Detach action</agui-button>
        </agui-toolbar>
      </section>
    </div>
  </agui-dialog>
`;
