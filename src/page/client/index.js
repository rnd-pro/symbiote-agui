import { COMPONENT_TAG, PROVIDER_TAG } from '../../markup/constants.js';
import { AguiComponent } from './component.js';
import { ContextProvider } from './context-provider.js';
import { connectSession } from './connection.js';

customElements.define(COMPONENT_TAG, AguiComponent);
customElements.define(PROVIDER_TAG, ContextProvider);
connectSession();

export { Symbiote, PubSub, html, css } from '@symbiotejs/symbiote';
export { AguiComponent, ContextProvider };
export { replaceContent } from './replace-content.js';
export { emit } from './events.js';
