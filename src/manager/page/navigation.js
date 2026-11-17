import { MANAGER_ROUTES } from '../sections.js';

export let NAVIGATION_STATE = {
  appSection: '',
  projectsView: 'connected',
  workspaceView: 'table',
  sectionIcon: '',
  sectionLoading: false,
  sectionError: '',
  router: {
    routes: structuredClone(MANAGER_ROUTES),
  },
  routeOptions: {},
  inspectorHidden: true,
  inspectorLabel: 'Selected session',
  inspectorKind: '',
};

/** @param {import('./index.js').SessionManager} owner */
export function syncNavigation(owner) {
  let section = String(owner.$.appSection);
  let projects = section === 'projects';
  owner.explorer?.activate(projects && !owner.$.allProjects && owner.$.projectsView === 'explorer');
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
