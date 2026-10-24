import { EXPLORER_OPERATIONS } from './explorer/constants.js';

export let PROJECT_OPERATIONS = Object.freeze({
  ...EXPLORER_OPERATIONS,
  projects: {
    bulk: false,
    confirm: false,
    target: 'none',
  },
  'connect project': {
    bulk: false,
    confirm: false,
    target: 'folder',
  },
  'forget project': {
    bulk: false,
    confirm: false,
    target: 'projectId',
  },
  'switch project': {
    bulk: false,
    confirm: false,
    target: 'projectId',
  },
  'open folder': {
    bulk: false,
    confirm: false,
    target: 'projectId',
  },
});
