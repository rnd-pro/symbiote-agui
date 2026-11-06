import { html } from '@symbiotejs/symbiote/core/html.js';

export let NAV_TEMPLATE = html`
  <nav class="grid gap-2" bind="@aria-label: navigationLabel; @aria-labelledby: navigationLabelledBy" itemize="entries">
    <template>
      <agui-button class="agui-nav-item agui-button-ghost w-full justify-start aria-[current=page]:text-agui-accent"
        bind="$.value: value; @aria-current: current; @disabled: disabled; onclick: select">
        <agui-icon bind="$.name: ^icon; hidden: !^icon"></agui-icon>{{label}}
      </agui-button>
    </template>
  </nav>
`;
