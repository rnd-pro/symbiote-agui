import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-map,
    agui-map-data {
      display: grid;
      min-inline-size: 0;
      gap: 1rem;
    }
    agui-map figure {
      display: grid;
      min-inline-size: 0;
      gap: .5rem;
      margin: 0;
    }
    .agui-map-description,
    .agui-map-attribution,
    .agui-map-skipped {
      color: var(--agui-muted);
      font-size: .875rem;
    }
    .agui-map-canvas {
      isolation: isolate;
      min-inline-size: 0;
      block-size: var(--agui-map-height, 22rem);
      background: var(--agui-surface);
      border: 1px solid var(--agui-divider);
      border-radius: var(--agui-radius-inset);
      overflow: hidden;
      color: var(--agui-text);
      font: inherit;
    }
    .agui-map-marker {
      display: grid;
      place-items: center;
      background: transparent;
      border: 0;
    }
    .agui-map-marker::after {
      content: '';
      inline-size: 1rem;
      block-size: 1rem;
      border: 2px solid var(--agui-surface);
      border-radius: 50%;
      background: var(--agui-accent);
      box-shadow: 0 0 0 1px var(--agui-text);
    }
    .agui-map-marker[aria-pressed="true"]::after {
      background: var(--agui-success);
      box-shadow: 0 0 0 3px var(--agui-text);
    }
    agui-map .leaflet-popup-content-wrapper {
      background: var(--agui-surface);
      color: var(--agui-text);
      font: inherit;
    }
    agui-map .leaflet-popup-tip {
      background: var(--agui-surface);
    }
    .agui-map-actions {
      display: flex;
      flex-wrap: wrap;
      gap: .5rem;
    }
    agui-map agui-map-data {
      margin-block-start: 1rem;
    }
    .agui-map-snapshot {
      display: block;
      inline-size: 100%;
      block-size: auto;
    }
  }
`;
