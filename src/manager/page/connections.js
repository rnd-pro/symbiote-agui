export let CONNECTIONS_STATE = {
  liveConnectionRows: {},
  connectionsMessage: 'Open Connections to inspect all running projects.',
  connectionsError: '',
  connectionsDisabled: true,
  verifiedPublicUrl: '',
};

class ConnectionsView extends UiComponent {}
ConnectionsView.template = CONNECTIONS_TEMPLATE;
ConnectionsView.reg('agui-manager-connections');

export class LiveConnections {
  /** @type {import('../../../types/connections.js').GlobalConnections | undefined} */
  listing;
  active = false;
  refreshing = false;
  epoch = 0;

  /** @param {import('./index.js').SessionManager} owner */
  constructor(owner) { this.owner = owner; }

  /** @param {boolean} active */
  activate(active) {
    this.active = active;
    if (active) { void this.refresh(); }
  }

  /** @param {boolean} ready */
  connectionChanged(ready) {
    this.epoch += 1;
    if (ready && this.active) { void this.refresh(); }
    this.render();
  }

  async refresh() {
    let owner = this.owner;
    if (!this.active || this.refreshing || !owner.connection?.ready) { return; }
    this.refreshing = true;
    let epoch = this.epoch;
    try {
      let result = await owner.connection.request('connections');
      if (epoch !== this.epoch || owner.disposed) { return; }
      if (!result.ok || !result.connections) { throw new Error(result.error?.message || 'Connection discovery failed.'); }
      this.listing = result.connections;
      owner.$.connectionsError = result.connections.errors.join('\n');
      this.render();
    } catch (error) {
      if (epoch === this.epoch && !owner.disposed) { owner.$.connectionsError = error instanceof Error ? error.message : String(error); }
    } finally { this.refreshing = false; }
  }

  render() {
    let owner = this.owner;
    let disabled = !owner.connection?.ready || owner.busy;
    let sessions = this.listing?.sessions || [];
    owner.$.connectionsDisabled = disabled;
    if (this.listing) {
      owner.$.connectionsMessage = `${sessions.length} sessions / ${sessions.reduce((total, entry) => total + entry.pages.length, 0)} browser connections / ${sessions.filter((entry) => entry.tunnel).length} tunnels across all projects. Updated ${new Date(this.listing.checkedAt).toLocaleTimeString()}.`;
    }
    owner.$.liveConnectionRows = Object.fromEntries(sessions.map((entry) => [
      `${entry.project.id}/${entry.sessionId}`,
      {
        key: `${entry.project.id}/${entry.sessionId}`,
        sessionId: entry.sessionId,
        project: entry.project.name,
        path: entry.project.folder || 'Default private cache',
        details: `${entry.state || 'unknown'} / PID ${entry.pid} / ${entry.pages.length} browser connections`,
        tunnel: entry.tunnel ? `Tunnel ${entry.tunnel.state}${entry.tunnel.active === true ? ' / reachable' : entry.tunnel.active === false ? ' / inactive' : ' / reachability unchecked'}${entry.tunnel.checkedAt ? ` / checked ${new Date(entry.tunnel.checkedAt).toLocaleTimeString()}` : ''}` : 'Local only',
        error: entry.error || entry.tunnel?.checkError || entry.tunnel?.error || '',
        url: entry.url || '',
        noLocal: !entry.url,
        publicDisabled: disabled || !entry.tunnel,
        tunnelDisabled: disabled || !entry.tunnel,
        stopDisabled: disabled || !entry.tunnel || !entry.manageable,
        openPublic: () => { void this.open(entry.sessionId, entry.project.id, false, entry.instanceId); },
        openViewer: () => { void this.open(entry.sessionId, entry.project.id, true, entry.instanceId); },
        check: () => { void this.run('connection tunnel check', entry); },
        renew: () => { void this.run('connection tunnel renew', entry); },
        stop: () => { void this.run('stop tunnel', entry); },
        pages: entry.pages.map((page) => ({
          id: page.pageId,
          title: page.title,
          url: page.url,
          details: `${page.role || 'interactive local'} / ${page.ready ? 'ready' : 'loading'}${page.connectedAt ? ` / connected ${new Date(page.connectedAt).toLocaleTimeString()}` : ''}`,
          disabled: disabled || !entry.manageable,
          disconnect: () => { void this.run('disconnect page', entry, page.pageId); },
        })),
      },
    ]));
  }

  /**
   * @param {string} sessionId
   * @param {string} projectId
   * @param {boolean} [viewer]
   * @param {string} [instanceId]
   */
  async open(sessionId, projectId, viewer = false, instanceId) {
    let owner = this.owner;
    if (owner.busy || !owner.connection?.ready) { return; }
    // Reserve a tab during the click; waiting for network checks loses browser activation.
    let tab = window.open('about:blank', '_blank');
    if (tab) {
      tab.opener = null;
      tab.document.title = 'Opening shared page';
      tab.document.body.textContent = 'Checking the public link...';
    }
    owner.busy = true;
    owner.$.verifiedPublicUrl = '';
    owner.$.noticeTone = 'info';
    owner.$.notice = `Checking the public link for ${sessionId}...`;
    owner.renderRows();
    let epoch = this.epoch;
    try {
      let result = await owner.connection.request('open public', {
        projectId,
        sessionId,
        ...(instanceId ? {
          instanceId,
        } : {}),
        viewer,
      });
      if (epoch !== this.epoch || owner.disposed) { tab?.close(); return; }
      if (!result.ok || !result.openUrl) { throw new Error(result.error?.message || 'The public link could not be verified.'); }
      if (tab && !tab.closed) { tab.location.replace(result.openUrl); }
      else { owner.$.verifiedPublicUrl = result.openUrl; }
      owner.$.notice = tab && !tab.closed ? `Opened ${sessionId}.` : 'Public link verified. Use Open verified link to continue.';
      await owner.refresh();
      await this.refresh();
    } catch (error) {
      tab?.close();
      if (epoch === this.epoch && !owner.disposed) {
        owner.$.noticeTone = 'alert';
        owner.$.notice = error instanceof Error ? error.message : String(error);
        await owner.refresh();
        await this.refresh();
      }
    } finally {
      owner.busy = false;
      owner.renderRows();
    }
  }

  /**
   * @param {import('../../../types/manager.js').ManagerOperation} operation
   * @param {import('../../../types/connections.js').LiveSessionConnections} entry
   * @param {string} [pageId]
   */
  async run(operation, entry, pageId) {
    let owner = this.owner;
    if (owner.busy || !owner.connection?.ready) { return; }
    let warnings = {
      'disconnect page': 'Disconnect this browser? Its live drafts stay in that tab. Reloading the tab can reconnect it.',
      'stop tunnel': 'Stop this public tunnel? Public visitors will disconnect. The session and local pages keep running.',
      'connection tunnel renew': 'Renew this tunnel? Its public URL will change and public visitors can disconnect.',
    };
    let warning = warnings[/** @type {keyof typeof warnings} */ (operation)];
    if (warning && !confirm(warning)) { return; }
    owner.busy = true;
    owner.$.noticeTone = 'info';
    owner.$.notice = `${operation}: ${entry.sessionId}...`;
    owner.renderRows();
    let epoch = this.epoch;
    try {
      let result = await owner.connection.request(operation, {
        projectId: entry.project.id,
        sessionId: entry.sessionId,
        instanceId: entry.instanceId,
        ...(pageId ? {
          pageId,
        } : {}),
        ...(warning ? {
          confirm: true,
        } : {}),
      });
      if (epoch !== this.epoch || owner.disposed) { return; }
      if (!result.ok) { throw new Error(result.error?.message || 'Connection operation failed.'); }
      owner.$.notice = `${entry.sessionId}: ${operation} completed`;
      await this.refresh();
      await owner.refresh();
    } catch (error) {
      if (epoch === this.epoch && !owner.disposed) {
        owner.$.noticeTone = 'alert';
        owner.$.notice = error instanceof Error ? error.message : String(error);
      }
    } finally {
      owner.busy = false;
      owner.renderRows();
    }
  }
}
import { UiComponent } from '../../page/client/uilib/shared/component.js';
import { CONNECTIONS_TEMPLATE } from './connections-template.js';

