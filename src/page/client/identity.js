import { html } from '@symbiotejs/symbiote/core/html.js';
import { SESSION_ICON_EMOJI } from '../icon-palette.js';

export function syncPageIdentity() {
  let sessionId = location.pathname.split('/')[1] || 'AGUI';
  if (document.title !== sessionId) { document.title = sessionId; }

  let color = 0;
  for (let character of sessionId) {
    color = (color * 31 + character.charCodeAt(0)) % SESSION_ICON_EMOJI.length;
  }
  let svg = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="90" text-anchor="middle" font-size="90">${SESSION_ICON_EMOJI[color]}</text></svg>`;
  let href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  let icon = document.querySelector('link[data-agui-icon]');
  if (!(icon instanceof HTMLLinkElement)) {
    icon = document.createElement('link');
    icon.setAttribute('data-agui-icon', '');
    icon.setAttribute('rel', 'icon');
    icon.setAttribute('type', 'image/svg+xml');
    icon.setAttribute('sizes', 'any');
    document.head.append(icon);
  }
  if (icon.getAttribute('href') !== href) { icon.setAttribute('href', href); }
}
