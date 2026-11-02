import { DATA_LIMITS } from '../../shared/data/constants.js';

export let TABLE_HOST_SELECTOR = 'agui-table, agui-chart-data, agui-map-data';

export let TABLE_LIMITS = Object.freeze({
  ...DATA_LIMITS,
  columns: DATA_LIMITS.fields,
});

export let TABLE_ATTRIBUTES = Object.freeze({
  label: 'label',
  idKey: 'id-key',
  selection: 'selection',
  locale: 'locale',
  pageSize: 'page-size',
  disabled: 'disabled',
  readonly: 'readonly',
  loading: 'loading',
  error: 'error',
});

export let TABLE_ITEM_TAGS = Object.freeze([
  'agui-table-heading',
  'agui-table-row',
  'agui-table-cell',
]);
