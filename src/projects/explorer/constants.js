export const EXPLORER_PAGE_SIZE = 100;
export const EXPLORER_DIRECTORY_LIMIT = 5000;
export const EXPLORER_PREVIEW_BYTES = 128 * 1024;

export let EXPLORER_OPERATIONS = Object.freeze({
  'project entries': {
    bulk: false,
    confirm: false,
    target: 'projectId',
  },
  'project preview': {
    bulk: false,
    confirm: false,
    target: 'projectId',
  },
});
