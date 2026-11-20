import { Symbiote } from '@symbiotejs/symbiote';
import '@symbiotejs/symbiote/webmcp';
import '@symbiotejs/symbiote/html-app';
import { connectSession } from './connection.js';
import { registerPageComponents } from './ui.js';
import './page-text.js';
import { guardNativeRegistrations } from '../../../uilib/shared/native-webmcp.js';

guardNativeRegistrations(Reflect.get(document, 'modelContext') || Reflect.get(navigator, 'modelContext'));
Symbiote.mcpToolMode = true;
registerPageComponents();
connectSession();

export { Symbiote, PubSub, html, css } from '@symbiotejs/symbiote';
export { BaseClass, SymComponent, SymContext, SymCollection, SymConditional, SymImport, SymRouter } from '@symbiotejs/symbiote/html-app';
export { replaceContent } from './replace-content.js';
export { emit, submitFeedback } from './events.js';
export { listPageTools, executePageTool } from './tools.js';
export { ToolDescriptor, getActiveWebMCPTools, webMCPRegistry } from '@symbiotejs/symbiote/webmcp';
export { executeWebMCPTool } from './tools.js';
export { FEEDBACK_CONTEXT } from '../../feedback/constants.js';
export { commitData, readDataCommit, getDataState } from './data.js';
export { DATA_CONTEXT } from '../../data/constants.js';
export { callConnector, readConnectorReceipt, CONNECTOR_CONTEXT } from './connectors.js';

export { authorizeConnector } from './connector-authorization.js';
