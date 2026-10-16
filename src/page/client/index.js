import { Symbiote } from '@symbiotejs/symbiote';
import '@symbiotejs/symbiote/webmcp';
import { COMPONENT_TAG, PROVIDER_TAG } from '../../markup/constants.js';
import { AguiComponent } from './component.js';
import { ContextProvider } from './context-provider.js';
import { connectSession } from './connection.js';

Symbiote.mcpToolMode = true;
AguiComponent.reg(COMPONENT_TAG);
ContextProvider.reg(PROVIDER_TAG);
connectSession();

export { Symbiote, PubSub, html, css } from '@symbiotejs/symbiote';
export { AguiComponent, ContextProvider };
export { replaceContent } from './replace-content.js';
export { emit } from './events.js';
export { listPageTools, executePageTool } from './tools.js';
export { ToolDescriptor, getActiveWebMCPTools, executeWebMCPTool, webMCPRegistry } from '@symbiotejs/symbiote/webmcp';
