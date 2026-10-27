import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-preloader {
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      inline-size: var(--agui-preloader-size, 1.5rem);
      block-size: var(--agui-preloader-size, 1.5rem);
      vertical-align: middle;
      color: inherit;
    }
    agui-preloader[hidden] {
      display: none;
    }
    .agui-preloader-indicator {
      display: block;
      box-sizing: border-box;
      inline-size: 100%;
      block-size: 100%;
      appearance: none;
      border: var(--agui-preloader-thickness, 2px) solid currentColor;
      border-inline-end-color: transparent;
      border-radius: 50%;
      background: transparent;
      color: inherit;
      animation: agui-preloader-working 1.2s linear infinite;
    }
    .agui-preloader-indicator::-webkit-progress-bar {
      display: none;
    }
    .agui-preloader-indicator::-webkit-progress-value {
      display: none;
    }
    .agui-preloader-indicator::-moz-progress-bar {
      display: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .agui-preloader-indicator {
        animation-duration: 6s;
      }
    }
    @media (forced-colors: active) {
      .agui-preloader-indicator {
        forced-color-adjust: none;
      }
    }
    @keyframes agui-preloader-working {
      to {
        rotate: 360deg;
      }
    }
  }
`;
