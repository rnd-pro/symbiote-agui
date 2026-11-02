import {
  html,
} from '@symbiotejs/symbiote/core/html.js';

export let MESSAGE_TEMPLATE = html`
  <agui-icon bind="$.name: iconName" aria-hidden="true"></agui-icon>
  <p class="agui-message-text" bind="textContent: message; @role: messageRole; @aria-live: liveMode" aria-atomic="true"></p>
  <button class="agui-message-dismiss agui-button-icon agui-button-ghost" type="button" bind="onclick: dismiss; @aria-label: closeLabel; hidden: !closeLabel">
    <agui-icon name="close" aria-hidden="true"></agui-icon>
  </button>
`;
