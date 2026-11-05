import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-preloader {
      position: relative;
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
      border: 0;
      background: transparent;
      color: inherit;
    }
    agui-preloader[variant='ring'] > .agui-preloader-indicator {
      border: var(--agui-preloader-thickness, 2px) solid currentColor;
      border-inline-end-color: transparent;
      border-radius: 50%;
      animation: agui-preloader-working 1.2s linear infinite;
    }
    .agui-preloader-dots {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12%;
      pointer-events: none;
    }
    agui-preloader[variant='ring'] > .agui-preloader-dots {
      display: none;
    }
    .agui-preloader-dots > span {
      inline-size: 22%;
      block-size: 22%;
      border-radius: 50%;
      background: currentColor;
      animation: agui-preloader-pulse 1.2s ease-in-out infinite;
    }
    .agui-preloader-dots > span:nth-child(1) {
      animation-delay: -0.3s;
    }
    .agui-preloader-dots > span:nth-child(2) {
      animation-delay: -0.15s;
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
      agui-preloader[variant='ring'] > .agui-preloader-indicator,
      .agui-preloader-dots > span {
        animation-duration: 6s;
      }
    }
    @media (forced-colors: active) {
      .agui-preloader-indicator,
      .agui-preloader-dots {
        forced-color-adjust: none;
      }
    }
    @keyframes agui-preloader-working {
      to {
        rotate: 360deg;
      }
    }
    @keyframes agui-preloader-pulse {
      0%, 60%, 100% {
        opacity: 0.35;
        scale: 0.65;
      }
      30% {
        opacity: 1;
        scale: 1;
      }
    }
  }
`;
