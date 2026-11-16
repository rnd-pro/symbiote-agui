import { css } from '@symbiotejs/symbiote';

export default css`
  @layer components {
    agui-breadcrumbs {
      display: block;
      min-inline-size: 0;
    }
    agui-breadcrumbs ol > :first-child > li > agui-icon {
      display: none;
    }
    agui-breadcrumbs:dir(rtl) li > agui-icon {
      rotate: 180deg;
    }
  }
`;
