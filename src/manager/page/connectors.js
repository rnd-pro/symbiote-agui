import { UiComponent } from '../../uilib/shared/component.js';
import { CONNECTOR_SETTINGS_TEMPLATE } from './connectors-template.js';
import { highlightSourcePreview } from './source-preview.js';

export const CONNECTOR_SETTINGS_STATE = {
  connectorOpen: false,
  connectorSession: '',
  connectorAction: '',
  connectorOptions: [],
  connectorNewAction: '',
  connectorRegistry: '',
  connectorAddress: '',
  connectorSource: 'agui',
  connectorSourceOptions: [
    {
      value: 'agui',
      label: 'Local browser',
    },
    {
      value: 'agent',
      label: 'Authenticated agent CLI',
    },
  ],
  connectorProfile: '',
  connectorPath: '',
  connectorRows: [],
  connectorListTexts: {
    empty: 'No connector actions attached.',
    invalidRows: 'Connector declarations are unavailable.',
  },
  connectorRuntime: '',
  connectorDescription: '',
  connectorSourceCode: '',
  connectorContract: '',
  connectorRevision: '',
  connectorDisabled: true,
  connectorActionDisabled: true,
  connectorGrantDisabled: true,
  connectorError: '',
  connectorMessage: '',
};

export class SessionConnectorSettings {
  sessionId = '';
  /** @type {import('../../../types/connectors.js').ManagerConnectorSettings | undefined} */
  settings;
  /** @type {import('../../../types/connectors.js').ConnectorReview | undefined} */
  reviewed;

  /** @param {import('./index.js').SessionManager} owner */
  constructor(owner) { this.owner = owner; }

  /** @param {string} sessionId */
  open(sessionId) {
    if (!this.owner.connection?.ready || this.owner.busy) { return; }
    this.reset();
    this.sessionId = sessionId;
    this.owner.set$({
      connectorOpen: true,
      connectorSession: sessionId,
      connectorNewAction: '',
      connectorRegistry: '',
      connectorAddress: '',
      connectorProfile: '',
      connectorError: '',
      connectorMessage: '',
    });
    return this.run();
  }

  reset() {
    this.settings = undefined;
    this.sessionId = '';
    this.owner.set$({
      connectorOptions: [],
      connectorRows: [],
      connectorAction: '',
    });
    this.clearReview();
  }

  clearReview() {
    this.reviewed = undefined;
    this.owner.set$({
      connectorDescription: '',
      connectorSourceCode: '',
      connectorContract: '',
      connectorRevision: '',
      connectorPath: '',
    });
    this.render();
  }

  render() {
    let owner = this.owner;
    let disabled = !owner.connection?.ready || owner.busy || !this.settings;
    let action = this.settings?.status.actions.find((entry) => entry.name === owner.$.connectorAction);
    owner.set$({
      connectorDisabled: disabled,
      connectorActionDisabled: disabled || !action,
      connectorGrantDisabled: disabled || !action || !this.reviewed?.prepared
        || this.reviewed.requirement.name !== action.name || this.reviewed.requirement.revision !== action.revision,
    });
  }

  /**
   * @param {string} command
   * @param {Event} event
   */
  submit(command, event) {
    event.preventDefault();
    let owner = this.owner;
    if (!event.isTrusted || Reflect.get(event, 'agentInvoked') === true || owner.$.connectorDisabled) { return; }
    let form = event.target;
    if (form instanceof HTMLFormElement && !form.reportValidity()) { return; }
    let action = String(owner.$.connectorAction);
    let changes = {
      attach: () => ({
        command: 'attach',
        action: String(owner.$.connectorNewAction).trim(),
        registry: String(owner.$.connectorRegistry).trim(),
        address: String(owner.$.connectorAddress).trim(),
      }),
      review: () => ({
        command: 'review',
        action,
        ...(String(owner.$.connectorPath).trim() ? {
          path: String(owner.$.connectorPath).trim(),
        } : {}),
      }),
      update: () => ({
        command: 'update',
        action,
        ...(String(owner.$.connectorRegistry).trim() ? {
          registry: String(owner.$.connectorRegistry).trim(),
        } : {}),
      }),
      grant: () => ({
        command: 'grant',
        action,
        revision: this.reviewed?.requirement.revision,
        source: owner.$.connectorSource,
        ...(String(owner.$.connectorProfile).trim() ? {
          profile: String(owner.$.connectorProfile).trim(),
        } : {}),
      }),
      revoke: () => ({
        command: 'revoke',
        action,
      }),
      detach: () => ({
        command: 'detach',
        action,
      }),
    };
    if (!Object.hasOwn(changes, command) || command === 'grant' && owner.$.connectorGrantDisabled
      || command !== 'attach' && owner.$.connectorActionDisabled) { return; }
    if (command !== 'attach' && command !== 'review'
      && !confirm(`${command} ${this.sessionId}/${action}? ${command === 'grant' ? 'Reviewed local code will run with host-user privileges when explicitly invoked.' : 'Active work may be cancelled; external writes cannot be rolled back.'}`)) { return; }
    return this.run(changes[/** @type {keyof typeof changes} */ (command)]());
  }

  /** @param {unknown} [change] */
  async run(change) {
    let owner = this.owner;
    let connection = owner.connection;
    if (!connection?.ready || owner.busy || !this.sessionId) { return; }
    let sessionId = this.sessionId;
    let epoch = owner.viewEpoch;
    let selected = String(owner.$.connectorAction);
    owner.busy = true;
    owner.$.connectorError = '';
    owner.$.connectorMessage = 'Loading connector settings...';
    owner.renderRows();
    try {
      let result = await connection.request(change ? 'connector change' : 'connector status', {
        sessionId,
        ...(change ? {
          confirm: true,
          connectorInstanceId: this.settings?.instanceId,
          connectorChange: change,
        } : {}),
      });
      if (!owner.isCurrentView(epoch) || this.sessionId !== sessionId) { return; }
      if (!result.ok || !result.connectorSettings) { throw new Error(result.error?.message || 'Connector settings are unavailable. Refresh before another change.'); }
      this.settings = result.connectorSettings;
      owner.$.connectorRuntime = `${this.settings.instanceId ? 'Running worker' : 'Stopped session'}; ${this.settings.status.pending} pending operations.`;
      let actions = this.settings.status.actions;
      owner.$.connectorOptions = actions.map((entry) => ({
        value: entry.name,
        label: `${entry.name} (${entry.effect})`,
      }));
      owner.$.connectorAction = actions.some((entry) => entry.name === selected) ? selected : actions[0]?.name || '';
      owner.$.connectorRows = actions.map((entry) => {
        let inspection = this.settings?.status.inspection.find((item) => item.name === entry.name);
        return {
          name: entry.name,
          binding: `${entry.address} (${entry.effect})`,
          revision: entry.revision,
          access: inspection?.resolved ? `${inspection.prepared ? 'Prepared' : 'Not prepared'}; access: ${inspection.configuredSources.join(', ') || 'none'}` : 'Local source missing or changed. Reconnect or update explicitly.',
        };
      });
      if (this.settings.review) {
        this.reviewed = this.settings.review;
        owner.$.connectorDescription = this.reviewed.description;
        owner.$.connectorSourceCode = this.reviewed.source || '';
        owner.$.connectorRevision = this.reviewed.requirement.revision;
        owner.$.connectorContract = JSON.stringify({
          manifest: this.reviewed.manifest,
          files: this.reviewed.files,
        }, null, 2);
        let code = document.querySelector('#connector-source');
        if (code instanceof HTMLElement) {
          void highlightSourcePreview(code, this.reviewed.source || '', String(owner.$.connectorPath) || 'index.js', () => owner.isCurrentView(epoch) && this.reviewed === result.connectorSettings?.review);
        }
      } else { this.clearReview(); }
      owner.$.connectorMessage = change ? 'Connector settings updated. No backend operation was executed.' : 'Local-only backend access. Attachments do not grant execution.';
    } catch (error) {
      if (owner.isCurrentView(epoch) && this.sessionId === sessionId) {
        owner.$.connectorMessage = '';
        owner.$.connectorError = error instanceof Error ? error.message : String(error);
        this.settings = undefined;
        this.clearReview();
      }
    } finally {
      owner.busy = false;
      owner.renderRows();
    }
  }
}

class ConnectorSettingsDialog extends UiComponent {}
ConnectorSettingsDialog.template = CONNECTOR_SETTINGS_TEMPLATE;
ConnectorSettingsDialog.reg('agui-connector-settings');
