import { Dashboard } from './layouts/dashboard/dashboard.js';
import { App } from './layouts/app/app.js';
import { Sidebar } from './layouts/sidebar/sidebar.js';
import { Viewport } from './layouts/viewport/viewport.js';
import { Panel } from './layouts/panel/panel.js';
import { Header } from './layouts/header/header.js';
import { Toolbar } from './layouts/toolbar/toolbar.js';
import { Field } from './controls/field/field.js';
import { Select } from './controls/select/select.js';
import { ThemeToggle } from './controls/theme-toggle/theme-toggle.js';
import { Toggle } from './controls/toggle/toggle.js';
import { State } from './feedback/state/state.js';
import { DataToolbar } from './controls/data-toolbar/data-toolbar.js';
import { Icon } from './content/icon/icon.js';
import {
  Message,
} from './feedback/message/message.js';

export function registerUiLibComponents() {
  App.reg('agui-app');
  Sidebar.reg('agui-sidebar');
  Viewport.reg('agui-viewport');
  Dashboard.reg('agui-dashboard');
  Panel.reg('agui-panel');
  Header.reg('agui-header');
  Toolbar.reg('agui-toolbar');
  Field.reg('agui-field');
  Select.reg('agui-select');
  Toggle.reg('agui-toggle');
  ThemeToggle.reg('agui-theme-toggle');
  State.reg('agui-state');
  Message.reg('agui-message');
  DataToolbar.reg('agui-data-toolbar');
  Icon.reg('agui-icon');
}
