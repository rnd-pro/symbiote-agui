export let NAVIGATION_STATE = {
  appSection: 'sessions',
  projectsView: 'connected',
  workspaceView: 'table',
  sectionTitle: 'Sessions',
  sectionIcon: 'dashboard',
  navigationItems: [
    {
      value: 'sessions',
      label: 'Sessions',
      icon: 'dashboard',
    },
    {
      value: 'projects',
      label: 'Projects',
      icon: 'folder_open',
    },
    {
      value: 'connections',
      label: 'Connections',
      icon: 'hub',
    },
    {
      value: 'settings',
      label: 'Settings',
      icon: 'settings',
    },
  ],
  inspectorHidden: true,
  inspectorLabel: 'Selected session',
  inspectorKind: '',
};

/** @param {import('./index.js').SessionManager} owner */
export function syncNavigation(owner) {
  let section = String(owner.$.appSection);
  let projects = section === 'projects';
  owner.explorer?.activate(projects && owner.$.projectsView === 'explorer');
  owner.liveConnections?.activate(section === 'connections');
  owner.renderRows();
  if (projects) {
    void owner.projects?.refresh();
    if (owner.$.projectsView === 'transfers') { void owner.transfers?.refreshHistory(); }
  }
}

/** @param {import('./index.js').SessionManager} owner */
export function syncInspector(owner) {
  let sections = {
    sessions: {
      selected: !owner.$.noSelection,
      label: 'Selected session',
    },
    projects: {
      selected: owner.$.projectsView === 'connected' && !owner.$.noProjectSelection,
      label: 'Selected project',
    },
    connections: {
      selected: !owner.$.noConnectionSelection,
      label: 'Selected connection',
    },
    settings: {
      selected: false,
      label: '',
    },
  };
  let current = sections[/** @type {keyof typeof sections} */ (owner.$.appSection)];
  owner.$ = {
    inspectorHidden: !current?.selected,
    inspectorLabel: current?.label || '',
    inspectorKind: current?.selected ? String(owner.$.appSection) : '',
  };
}
