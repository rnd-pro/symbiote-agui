import { registerUiLibComponents } from '../../../uilib/index.js';
import { DataToolbar } from './controls/data-toolbar/data-toolbar.js';
import { Connector } from './controls/connector/connector.js';
import { SessionThemeToggle } from './theme-toggle.js';
import { SessionThemeSelector } from './theme-selector.js';
import { setTextSourceResolver } from '../../../uilib/shared/source.js';
import { proxySourceUrl } from './proxy-source.js';

export function registerPageComponents() {
  setTextSourceResolver(proxySourceUrl);
  registerUiLibComponents({
    themeToggle: SessionThemeToggle,
    themeSelector: SessionThemeSelector,
  });
  Connector.reg('agui-connector');
  DataToolbar.reg('agui-data-toolbar');
}
