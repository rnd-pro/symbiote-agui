export let PROJECT_STATE = {
  projectsOpen: false,
  projectFolder: '',
  projectChoice: '',
  projectOptions: [],
  projectRows: {},
  projectName: 'Loading projects...',
  projectPath: '',
  projectError: '',
  projectsDisabled: true,
  projectSwitchDisabled: true,
  projectOpenDisabled: true,
};

export class ProjectNavigation {
  /** @type {import('../../../types/projects.js').ProjectListing | undefined} */
  listing;
  refreshing = false;
  issue = '';
  discoveryError = '';

  /** @param {import('./index.js').SessionManager} owner */
  constructor(owner) {
    this.owner = owner;
  }

  /** @param {import('../../../types/projects.js').ProjectListing} listing */
  apply(listing) {
    this.listing = listing;
    this.discoveryError = '';
    let choice = String(this.owner.$.projectChoice);
    if (!listing.projects.some((entry) => entry.id === choice)) { this.owner.$.projectChoice = listing.currentProjectId; }
    this.render();
    this.owner.explorer?.setProject(listing.currentProjectId);
  }

  render() {
    let owner = this.owner;
    let listing = this.listing;
    let disabled = !owner.connection?.ready || owner.busy || owner.navigating;
    let currentId = listing?.currentProjectId;
    let current = listing?.projects.find((entry) => entry.id === currentId);
    let choice = listing?.projects.find((entry) => entry.id === owner.$.projectChoice);
    owner.set$({
      projectName: current?.name || 'Projects',
      projectPath: current?.folder || owner.snapshot?.storage.defaultFolder || 'Default private cache',
      projectError: this.issue || this.discoveryError,
      projectsDisabled: disabled,
      projectSwitchDisabled: disabled || !choice?.available || choice.id === currentId,
      projectOpenDisabled: disabled || !choice?.available,
      projectOptions: (listing?.projects || []).map((entry) => ({
        value: entry.id,
        label: entry.folder ? `${entry.name} - ${entry.folder}` : entry.name,
        disabled: !entry.available,
      })),
      projectRows: Object.fromEntries((listing?.projects || []).map((entry) => [
        entry.id,
        {
          id: entry.id,
          name: entry.name,
          path: entry.folder || owner.snapshot?.storage.defaultFolder || 'Default private cache',
          current: entry.id === currentId,
          availability: entry.available ? 'Available' : 'Unavailable',
          error: entry.error || '',
          lastUsed: entry.lastUsedAt ? `Last used ${new Date(entry.lastUsedAt).toLocaleString()}` : 'Not opened yet',
          switchDisabled: disabled || !entry.available || entry.id === currentId,
          openDisabled: disabled || !entry.available,
          forgetDisabled: disabled || entry.id === 'default' || entry.id === currentId,
          switchProject: () => { void this.run('switch project', entry.id, currentId); },
          openFolder: () => { void this.run('open folder', entry.id, currentId); },
          forgetProject: () => { void this.run('forget project', entry.id, currentId); },
        },
      ])),
    });
  }

  async refresh() {
    let owner = this.owner;
    if (!owner.connection?.ready || this.refreshing || owner.navigating) { return; }
    let epoch = owner.viewEpoch;
    this.refreshing = true;
    try {
      let result = await owner.connection.request('projects');
      if (!owner.isCurrentView(epoch)) { return; }
      if (!result.ok || !result.projects) { throw new Error(result.error?.message || 'Project discovery failed.'); }
      this.apply(result.projects);
    } catch (error) {
      if (owner.isCurrentView(epoch)) {
        this.discoveryError = error instanceof Error ? error.message : String(error);
        this.render();
      }
    } finally { this.refreshing = false; }
  }

  open() {
    this.owner.$.projectsOpen = true;
    void this.refresh();
  }

  /**
   * @param {'connect project' | 'switch project' | 'forget project' | 'open folder'} operation
   * @param {string} [projectId]
   * @param {string} [sourceId]
   */
  async run(operation, projectId, sourceId = this.listing?.currentProjectId) {
    let owner = this.owner;
    let connection = owner.connection;
    if (!connection?.ready || owner.busy || owner.navigating || sourceId !== this.listing?.currentProjectId) { return; }
    let folder = String(owner.$.projectFolder).trim();
    if (operation === 'connect project' && !folder) { this.issue = 'Enter an existing folder path.'; this.render(); return; }
    let selected = this.listing?.projects.find((entry) => entry.id === projectId);
    if (operation !== 'connect project' && !selected) { this.issue = 'Refresh projects before selecting this connection.'; this.render(); return; }
    if (operation === 'switch project' && (selected?.id === sourceId || !selected?.available)) { return; }
    let epoch = ++owner.viewEpoch;
    owner.busy = true;
    this.issue = '';
    owner.$.noticeTone = 'info';
    owner.$.notice = `${operation}: working...`;
    owner.renderRows();
    try {
      let result = await connection.request(operation, operation === 'connect project' ? {
        folder,
      } : {
        projectId,
      });
      if (!owner.isCurrentView(epoch)) { return; }
      if (!result.ok) { throw new Error(result.error?.message || 'The project operation failed.'); }
      if (operation === 'switch project') {
        if (!result.manager) { throw new Error('The selected project manager could not open.'); }
        if (!owner.navigate(result.manager)) { owner.$.projectsOpen = false; }
      } else if (operation === 'open folder') {
        if (!result.folderPath) { throw new Error('The manager did not return the requested folder path.'); }
        owner.$.notice = `Requested opening ${result.folderPath} in the host file manager. Check the desktop for its window.`;
      } else {
        if (operation === 'connect project') {
          owner.$.projectFolder = '';
          owner.$.projectChoice = result.project?.id || owner.$.projectChoice;
        }
        if (result.projects) { this.apply(result.projects); }
        owner.$.notice = operation === 'connect project' ? 'Project connected. Select Switch to open it.' : 'Connection forgotten. Files and sessions are unchanged.';
      }
    } catch (error) {
      if (owner.isCurrentView(epoch)) {
        this.issue = error instanceof Error ? error.message : String(error);
        owner.$.noticeTone = 'alert';
        owner.$.notice = this.issue;
      }
    } finally {
      if (!owner.disposed && !owner.navigating) {
        owner.busy = false;
        owner.renderRows();
        await this.refresh();
        void owner.refresh();
      }
    }
  }
}
