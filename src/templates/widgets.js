import { deriveTable, selectedIds } from '../../uilib/widgets/table/model.js';
import { deriveFilter } from '../../uilib/widgets/filter/model.js';
import { deriveChart } from '../../uilib/widgets/chart/model.js';
import { deriveMap } from '../../uilib/widgets/map/model.js';
import { validateRows } from '../../uilib/shared/data/validate.js';
import { CommandError } from '../shared/command-error.js';
import { THEME_PALETTES } from '../../uilib/controls/theme-selector/palettes.js';

// Pure model validation needs a complete state; these fields do not render copy.
let presentationState = {
  label: '',
  description: '',
  texts: {},
  disabled: false,
  readonly: false,
  loading: false,
  error: '',
};

/** @param {import('../../types/templates.js').TemplateConfiguration} config */
function collection(config) {
  if (!THEME_PALETTES.includes(String(config.APP.palette))) { throw new Error('invalidPalette'); }
  let model = deriveTable(/** @type {import('../../uilib/types/uilib-table.js').UiTableState} */ (/** @type {unknown} */ ({
    ...presentationState,
    rows: config.DATA.records,
    columns: config.DATA.columns,
    value: config.UI.selectedIds,
    filteredIds: null,
    sort: null,
    idKey: 'id',
    selection: config.UI.selectionMode,
    page: 1,
    pageSize: 20,
    locale: 'en',
  })));
  selectedIds(model, /** @type {string[]} */ (config.UI.selectedIds));
  deriveFilter(/** @type {import('../../uilib/types/uilib-filter.js').UiFilterState} */ ({
    ...presentationState,
    rows: model.state.rows,
    fields: model.state.columns,
    value: config.UI.filters,
    query: config.UI.query,
    idKey: 'id',
    locale: 'en',
  }));
}

/** @param {import('../../types/templates.js').TemplateConfiguration} config */
function dashboard(config) {
  validateRows(/** @type {import('../../uilib/types/uilib-data.js').UiDataRecord[]} */ (config.DATA.metrics), 'id');
  deriveChart(/** @type {import('../../uilib/types/uilib-chart.js').UiChartState} */ (/** @type {unknown} */ ({
    ...presentationState,
    rows: config.DATA.chartRows,
    series: config.DATA.chartSeries,
    value: [],
    type: config.APP.chartType,
    selection: 'none',
    idKey: 'id',
    xKey: 'label',
    xLabel: config.APP.chartXLabel,
    xType: 'text',
    locale: 'en',
  })));
  deriveMap(/** @type {import('../../uilib/types/uilib-map.js').UiMapState} */ (/** @type {unknown} */ ({
    ...presentationState,
    rows: config.DATA.mapRows,
    value: [],
    view: config.UI.mapView,
    tiles: config.DATA.mapTiles,
    selection: 'none',
    idKey: 'id',
    latitudeKey: 'latitude',
    longitudeKey: 'longitude',
    labelKey: 'label',
  })));
}

let validators = {
  collection,
  dashboard,
};

/**
 * Validate configured widget inputs using their existing pure library models.
 * @param {string} id
 * @param {import('../../types/templates.js').TemplateConfiguration} config
 */
export function validateTemplateWidgets(id, config) {
  let validate = Object.hasOwn(validators, id) ? validators[/** @type {keyof typeof validators} */ (id)] : undefined;
  try { validate?.(config); }
  catch (error) {
    throw new CommandError(`Invalid ${id} widget configuration: ${/** @type {Error} */ (error).message}.`);
  }
}
