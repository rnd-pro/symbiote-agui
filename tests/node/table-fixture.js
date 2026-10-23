/** @returns {import('../../types/uilib-table.js').UiTableState} */
export function tableState() {
  return {
    rows: [
      {
        id: 'a',
        name: 'Alpha',
        score: 0,
        active: false,
        date: '2026-02-28T23:00:00Z',
      },
      {
        id: 'b',
        name: 'Beta',
        score: 10,
        active: true,
        date: '2026-03-01',
      },
      {
        id: 'c',
        name: 'Gamma',
        score: 10,
        active: false,
        date: '2026-02-31',
      },
      {
        id: 'd',
        name: 'Delta',
        score: null,
        active: null,
      },
      {
        id: 'e',
        name: 'Epsilon',
        score: -2,
        active: true,
      },
      {
        id: 'f',
        name: 'Zeta',
        score: 'invalid',
        active: false,
      },
    ],
    columns: [
      {
        key: 'name',
        label: 'Name',
        type: 'text',
        sortable: true,
        filter: 'contains',
      },
      {
        key: 'score',
        label: 'Score',
        type: 'number',
        sortable: true,
        filter: 'range',
      },
      {
        key: 'active',
        label: 'Active',
        type: 'boolean',
        filter: 'equals',
      },
      {
        key: 'date',
        label: 'Date',
        type: 'date',
        sortable: true,
        filter: 'range',
      },
    ],
    value: [
      'd',
      'missing',
    ],
    filteredIds: null,
    sort: null,
    idKey: 'id',
    selection: 'multiple',
    locale: 'en',
    page: 1,
    pageSize: 2,
    label: 'Records',
    texts: {
      trueLabel: 'Yes',
      falseLabel: 'No',
    },
    disabled: false,
    readonly: false,
    loading: false,
    error: '',
  };
}
