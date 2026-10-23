import { FIELD_TEMPLATE, TEXTAREA_TEMPLATE } from './controls/field/template.js';
import { SELECT_TEMPLATE } from './controls/select/template.js';
import { TOGGLE_TEMPLATE } from './controls/toggle/template.js';
import { STATE_TEMPLATE } from './feedback/state/template.js';
import { DATA_TOOLBAR_TEMPLATE } from './controls/data-toolbar/template.js';
import { ICON_TEMPLATE } from './content/icon/template.js';
import { SIDEBAR_TEMPLATE } from './layouts/sidebar/template.js';
import { TABS_TEMPLATE, TAB_BUTTON_TEMPLATE } from './layouts/tabs/template.js';
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
  message: MESSAGE_TEMPLATE,
});
