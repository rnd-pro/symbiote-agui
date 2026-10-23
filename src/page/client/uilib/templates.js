import { FIELD_TEMPLATE, TEXTAREA_TEMPLATE } from './controls/field/template.js';
import { SELECT_TEMPLATE } from './controls/select/template.js';
import { TOGGLE_TEMPLATE } from './controls/toggle/template.js';
import { STATE_TEMPLATE } from './feedback/state/template.js';
import { DATA_TOOLBAR_TEMPLATE } from './controls/data-toolbar/template.js';
import { ICON_TEMPLATE } from './content/icon/template.js';
import { SIDEBAR_TEMPLATE } from './layouts/sidebar/template.js';
import { TABS_TEMPLATE, TAB_BUTTON_TEMPLATE } from './layouts/tabs/template.js';
import { DIALOG_TEMPLATE } from './feedback/dialog/template.js';
import { FILTER_TEMPLATE, FILTER_FIELD_TEMPLATE } from './widgets/filter/template.js';
import { CHART_TEMPLATE } from './widgets/chart/template.js';
import { MAP_TEMPLATE } from './widgets/map/template.js';
import { KANBAN_TEMPLATE, KANBAN_COLUMN_TEMPLATE, KANBAN_CARD_TEMPLATE } from './widgets/kanban/template.js';
import { TABLE_TEMPLATE, TABLE_ROW_TEMPLATE, TABLE_HEADING_TEMPLATE, TABLE_CELL_TEMPLATE } from './widgets/table/template.js';
import {
  MESSAGE_TEMPLATE,
} from './feedback/message/template.js';

export let UILIB_TEMPLATES = Object.freeze({
  field: FIELD_TEMPLATE,
  textarea: TEXTAREA_TEMPLATE,
  select: SELECT_TEMPLATE,
  toggle: TOGGLE_TEMPLATE,
  state: STATE_TEMPLATE,
  dataToolbar: DATA_TOOLBAR_TEMPLATE,
  icon: ICON_TEMPLATE,
  sidebar: SIDEBAR_TEMPLATE,
  tabs: TABS_TEMPLATE,
  tabButton: TAB_BUTTON_TEMPLATE,
  dialog: DIALOG_TEMPLATE,
  chart: CHART_TEMPLATE,
  map: MAP_TEMPLATE,
  kanban: KANBAN_TEMPLATE,
  kanbanColumn: KANBAN_COLUMN_TEMPLATE,
  kanbanCard: KANBAN_CARD_TEMPLATE,
  table: TABLE_TEMPLATE,
  tableRow: TABLE_ROW_TEMPLATE,
  tableHeading: TABLE_HEADING_TEMPLATE,
  tableCell: TABLE_CELL_TEMPLATE,
  filter: FILTER_TEMPLATE,
  filterField: FILTER_FIELD_TEMPLATE,
  message: MESSAGE_TEMPLATE,
});
