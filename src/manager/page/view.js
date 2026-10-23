/** @type {import('../../../types/uilib-table.js').UiTableColumn[]} */
export let SESSION_COLUMNS = [
  {
    key: 'id',
    label: 'Session ID',
    type: 'text',
    sortable: true,
  },
  {
    key: 'title',
    label: 'Name',
    type: 'text',
    sortable: true,
  },
  {
    key: 'status',
    label: 'Status',
    type: 'status',
    sortable: true,
    filter: 'equals',
    options: [
      {
        value: 'running',
        label: 'Running',
        tone: 'success',
      },
      {
        value: 'stopped',
        label: 'Stopped',
      },
      {
        value: 'unknown',
        label: 'Unknown',
        tone: 'warning',
      },
    ],
  },
  {
    key: 'clients',
    label: 'Connections',
    type: 'number',
    sortable: true,
  },
  {
    key: 'pid',
    label: 'Process ID',
    type: 'number',
    sortable: true,
  },
];

/** @type {import('../../../types/uilib-data.js').UiDataField[]} */
export let SESSION_FILTER_FIELDS = [
  ...SESSION_COLUMNS,
  {
    key: 'search',
    label: 'Description and metadata',
    type: 'text',
  },
];

export let FILTER_TEXTS = {
  search: 'Search sessions',
  all: 'All statuses',
  empty: 'No matching sessions.',
  loading: 'Loading sessions...',
  invalidRows: 'Session records could not be displayed.',
  invalidFields: 'Session filters could not be displayed.',
  invalidState: 'Reset the session filters and try again.',
};

export let TABLE_TEXTS = {
  results: 'Sessions',
  selected: 'Selected',
  selection: 'Select',
  selectRow: 'Select session',
  page: 'Page',
  pagination: 'Session pages',
  previous: 'Previous page',
  next: 'Next page',
  empty: 'No sessions match these filters.',
  loading: 'Loading sessions...',
  invalidRows: 'Session records could not be displayed.',
  invalidColumns: 'Session columns could not be displayed.',
  invalidState: 'Session view could not be displayed.',
  unavailable: 'Session selection is unavailable.',
};

export let DESCRIPTION_TEXTS = {
  loading: 'Loading description...',
  empty: 'No description.',
  loadFailed: 'The Markdown renderer could not load. Reload the manager to retry.',
  renderFailed: 'The description could not be rendered.',
  invalidValue: 'The description must be Markdown text.',
  inputTooLarge: 'The description exceeds the document size limit.',
  outputTooLarge: 'The rendered description exceeds the document size limit.',
};

/** @param {import('../../../types/manager.js').ManagerSession} row */
export function sessionStatus(row) {
  return row.active === null || !row.ok ? 'unknown' : row.active ? 'running' : 'stopped';
}

/** @param {import('../../../types/manager.js').ManagerSession[]} sessions */
export function sessionRecords(sessions) {
  return sessions.map((row) => ({
    id: row.sessionId,
    title: row.definition?.title || row.sessionId,
    status: sessionStatus(row),
    clients: row.clients ?? 0,
    pid: row.pid ?? null,
    search: `${row.definition?.description || ''} ${JSON.stringify(row.definition?.metadata ?? {})}`,
  }));
}
