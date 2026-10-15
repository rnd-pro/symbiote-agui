import { COMPONENT_TAG, PROVIDER_TAG } from './constants.js';
import { AguiComponent } from './component.js';
import { ContextProvider } from './context-provider.js';

customElements.define(COMPONENT_TAG, AguiComponent);
customElements.define(PROVIDER_TAG, ContextProvider);

export { Symbiote, PubSub, html, css } from '@symbiotejs/symbiote';
export { AguiComponent, ContextProvider };
export { replaceContent } from './replace-content.js';
