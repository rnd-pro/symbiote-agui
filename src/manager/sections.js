export let MANAGER_ROUTES = Object.freeze({
  sessions: {
    title: 'Sessions',
    icon: 'dashboard',
    src: './page/sections/sessions.html',
    default: true,
  },
  projects: {
    title: 'Projects',
    icon: 'folder_open',
    src: './page/sections/projects.html',
  },
  connections: {
    title: 'Connections',
    icon: 'hub',
    src: './page/sections/connections.html',
  },
  settings: {
    title: 'Settings',
    icon: 'settings',
    src: './page/sections/settings.html',
  },
});

export let MANAGER_SECTIONS = Object.freeze(Object.fromEntries(Object.entries(MANAGER_ROUTES).map(([
  name,
  route,
]) => [
  name,
  new URL(route.src, import.meta.url),
])));
