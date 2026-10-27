import { css } from '@symbiotejs/symbiote';
import { html } from '@symbiotejs/symbiote/core/html.js';
import { itemizeProcessor } from '@symbiotejs/symbiote/core/itemizeProcessor-keyed.js';
import { UiComponent } from '../uilib/shared/component.js';

export class MarkerLayer extends UiComponent {
  init$ = {
    markers: [],
  };

  constructor() {
    super();
    this.templateProcessors.add(/** @type {typeof import('@symbiotejs/symbiote/core/slotProcessor.js').slotProcessor} */ (itemizeProcessor));
  }

  renderCallback() {
    this.setAttribute('aria-hidden', 'true');
    this.setAttribute('popover', 'manual');
    this.raise();
  }

  raise() {
    if (!this.isConnected || !this.hasAttribute('popover')) { return; }
    if (this.matches(':popover-open')) { this.hidePopover(); }
    this.showPopover();
  }
}

MarkerLayer.template = html`
  <canvas ref="trails" class="agui-viewer-trails"></canvas>
  <div itemize="markers">
    <template>
      <span class="agui-viewer-marker" bind="@data-viewer: id; style.color: color; style.translate: position">
        <agui-icon name="edit"></agui-icon>
      </span>
    </template>
  </div>
`;

MarkerLayer.rootStyles = css`
  @layer components {
    agui-viewer-markers[popover] {
      position: fixed;
      inset: 0;
      inline-size: 100%;
      block-size: 100%;
      max-inline-size: none;
      max-block-size: none;
      margin: 0;
      padding: 0;
      border: 0;
      overflow: visible;
      background: transparent;
      pointer-events: none;
    }
    agui-viewer-markers::backdrop {
      background: transparent;
      pointer-events: none;
    }
    .agui-viewer-marker {
      --agui-icon-size: 1.5rem;
      position: absolute;
      inset-block-start: 0;
      inset-inline-start: 0;
      transform: translate(-.15rem, -1.35rem);
      filter: drop-shadow(0 1px 1px var(--agui-bg));
      pointer-events: none;
    }
    .agui-viewer-trails {
      position: absolute;
      inset: 0;
      inline-size: 100%;
      block-size: 100%;
      pointer-events: none;
    }
  }
`;

MarkerLayer.reg('agui-viewer-markers');
