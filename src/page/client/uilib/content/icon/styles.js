import { css } from '@symbiotejs/symbiote';
import font from './font-data.js';

export default css`
  @font-face {
    font-family: 'AGUI Material Symbols';
    src: url('${font}') format('woff2');
    font-style: normal;
    font-weight: 100 700;
    font-display: block;
  }
  @layer components {
    agui-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
      width: 1em;
      height: 1em;
      vertical-align: middle;
      overflow: hidden;
      font-family: 'AGUI Material Symbols';
      font-size: var(--agui-icon-size, 1.5rem);
      font-style: normal;
      font-weight: normal;
      font-variant-ligatures: discretionary-ligatures;
      font-feature-settings: 'liga';
      font-variation-settings: 'FILL' var(--agui-icon-fill, 0), 'wght' var(--agui-icon-weight, 400), 'GRAD' var(--agui-icon-grade, 0), 'opsz' var(--agui-icon-optical-size, 24);
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      white-space: nowrap;
      direction: ltr;
      user-select: none;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  }
`;
