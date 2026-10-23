import { Symbiote } from '@symbiotejs/symbiote';
import '@symbiotejs/symbiote/webmcp';
import { COMPONENT_TAG, PROVIDER_TAG } from '../../markup/constants.js';
import { AguiComponent } from './component.js';
import { ContextProvider } from './context-provider.js';
import { connectSession } from './connection.js';
import { registerUiLibComponents } from './uilib/index.js';
import './page-text.js';
import { guardNativeRegistrations } from './native-webmcp.js';

guardNativeRegistrations(Reflect.get(document, 'modelContext') || Reflect.get(navigator, 'modelContext'));
Symbiote.mcpToolMode = true;
AguiComponent.reg(COMPONENT_TAG);
ContextProvider.reg(PROVIDER_TAG);
registerUiLibComponents();
connectSession();

export { Symbiote, PubSub, html, css } from '@symbiotejs/symbiote';
export { AguiComponent, ContextProvider };
export { replaceContent } from './replace-content.js';
export { emit, submitFeedback } from './events.js';
export { listPageTools, executePageTool } from './tools.js';
export { ToolDescriptor, getActiveWebMCPTools, webMCPRegistry } from '@symbiotejs/symbiote/webmcp';
export { executeWebMCPTool } from './tools.js';
export { FEEDBACK_CONTEXT } from '../../feedback/constants.js';
export { commitData, readDataCommit, getDataState } from './data.js';
export { DATA_CONTEXT } from '../../data/constants.js';
