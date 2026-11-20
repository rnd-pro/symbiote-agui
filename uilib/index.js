import { Dashboard } from './layouts/dashboard/dashboard.js';
import { App } from './layouts/app/app.js';
import { Sidebar } from './layouts/sidebar/sidebar.js';
import { SidebarBlock } from './layouts/sidebar-block/sidebar-block.js';
import { Viewport } from './layouts/viewport/viewport.js';
import { Tabs } from './controls/tabs/tabs.js';
import { Tab } from './controls/tabs/tab.js';
import { TabButton } from './controls/tabs/tab-button.js';
import { Panel } from './layouts/panel/panel.js';
import { Header } from './layouts/header/header.js';
import { Footer } from './layouts/footer/footer.js';
import { Toolbar } from './layouts/toolbar/toolbar.js';
import { Field } from './controls/field/field.js';
import { Button } from './controls/button/button.js';
import { Nav } from './controls/nav/nav.js';
import { Breadcrumbs } from './controls/breadcrumbs/breadcrumbs.js';
import { Select } from './controls/select/select.js';
import { ThemeToggle } from './controls/theme-toggle/theme-toggle.js';
import { ThemeSelector } from './controls/theme-selector/theme-selector.js';
import { Toggle } from './controls/toggle/toggle.js';
import { State } from './feedback/state/state.js';
import { Preloader } from './feedback/preloader/preloader.js';
import { Steps } from './feedback/steps/steps.js';
import { Icon } from './content/icon/icon.js';
import { Dialog } from './feedback/dialog/dialog.js';
import { Chart } from './widgets/chart/chart.js';
import { ChartDataTable } from './widgets/chart/data-table.js';
import { AguiMap } from './widgets/map/map.js';
import { MapDataTable } from './widgets/map/data-table.js';
import { Markdown } from './widgets/markdown/markdown.js';
import { Diagram } from './widgets/diagram/diagram.js';
import { Kanban } from './widgets/kanban/kanban.js';
import { KanbanColumn } from './widgets/kanban/column.js';
import { KanbanCard } from './widgets/kanban/card.js';
import { Table } from './widgets/table/table.js';
import { TableRow } from './widgets/table/row.js';
import { TableCell } from './widgets/table/cell.js';
import { TableHeading } from './widgets/table/heading.js';
import { Filter } from './widgets/filter/filter.js';
import { FilterField } from './widgets/filter/field.js';
import { List } from './widgets/list/list.js';
import { Explorer } from './widgets/explorer/explorer.js';
import { Message } from './feedback/message/message.js';
import { watchScrollbarActivity } from './shared/scrollbars.js';
import { loadIconFont } from './content/icon/loader.js';
import { setLibraryAssetBase } from './shared/assets.js';
import * as Foundation from './foundation.js';
export * from './foundation.js';
export { default } from './foundation.js';
export { loadIconFont };
export { ICON_FONT_STYLESHEET } from './content/icon/font.js';

export {
  Dashboard,
  App,
  Sidebar,
  SidebarBlock,
  Viewport,
  Tabs,
  Tab,
  TabButton,
  Panel,
  Header,
  Footer,
  Toolbar,
  Field,
  Button,
  Nav,
  Breadcrumbs,
  Select,
  ThemeToggle,
  ThemeSelector,
  Toggle,
  State,
  Preloader,
  Steps,
  Icon,
  Dialog,
  Chart,
  ChartDataTable,
  AguiMap,
  MapDataTable,
  Markdown,
  Diagram,
  Kanban,
  KanbanColumn,
  KanbanCard,
  Table,
  TableRow,
  TableCell,
  TableHeading,
  Filter,
  FilterField,
  List,
  Explorer,
  Message,
};

/** @param {{ themeToggle?: typeof ThemeToggle; themeSelector?: typeof ThemeSelector; assetBaseUrl?: URL | string }} [components] */
export function registerUiLibComponents(components = {}) {
  /** @type {Record<string, CustomElementConstructor & { reg(tagName: string): unknown }>} */
  let registrations = {
    'agui-app': App,
    'agui-sidebar': Sidebar,
    'agui-viewport': Viewport,
    'agui-tab-button': TabButton,
    'agui-tab': Tab,
    'agui-tabs': Tabs,
    'agui-dashboard': Dashboard,
    'agui-panel': Panel,
    'agui-sidebar-block': SidebarBlock,
    'agui-header': Header,
    'agui-footer': Footer,
    'agui-toolbar': Toolbar,
    'agui-button': Button,
    'agui-nav': Nav,
    'agui-breadcrumbs': Breadcrumbs,
    'agui-field': Field,
    'agui-select': Select,
    'agui-toggle': Toggle,
    'agui-theme-toggle': components.themeToggle ?? ThemeToggle,
    'agui-theme-selector': components.themeSelector ?? ThemeSelector,
    'agui-preloader': Preloader,
    'agui-steps': Steps,
    'agui-state': State,
    'agui-dialog': Dialog,
    'agui-message': Message,
    'agui-icon': Icon,
    'agui-table-cell': TableCell,
    'agui-table-row': TableRow,
    'agui-table-heading': TableHeading,
    'agui-filter-field': FilterField,
    'agui-filter': Filter,
    'agui-table': Table,
    'agui-list': List,
    'agui-explorer': Explorer,
    'agui-chart-data': ChartDataTable,
    'agui-chart': Chart,
    'agui-map-data': MapDataTable,
    'agui-map': AguiMap,
    'agui-markdown': Markdown,
    'agui-diagram': Diagram,
    'agui-kanban-card': KanbanCard,
    'agui-kanban-column': KanbanColumn,
    'agui-kanban': Kanban,
  };
  // Native registration reports constructor conflicts before any library tags mount.
  for (let component of Object.values(Foundation)) {
    if (typeof component !== 'function' || !(component.prototype instanceof Foundation.BaseClass)) { continue; }
    let constructor = /** @type {typeof Foundation.BaseClass} */ (component);
    if (customElements.get(constructor.is) !== constructor) {
      customElements.define(constructor.is, constructor);
    }
  }
  for (let [
    tag,
    component,
  ] of Object.entries(registrations)) {
    let existing = customElements.get(tag);
    if (existing && existing !== component) { customElements.define(tag, component); }
  }
  if (components.assetBaseUrl) { setLibraryAssetBase(components.assetBaseUrl); }
  void loadIconFont(document);
  watchScrollbarActivity(document);
  for (let [
    tag,
    component,
  ] of Object.entries(registrations)) { component.reg(tag); }
}
