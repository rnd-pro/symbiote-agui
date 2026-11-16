import { html } from '@symbiotejs/symbiote/core/html.js';

export let BREADCRUMBS_TEMPLATE = html`
  <nav bind="@aria-label: navigationLabel; @aria-labelledby: navigationLabelledBy">
    <ol class="flex min-w-0 flex-wrap items-center gap-x-1" itemize="entries">
      <template>
        <li class="flex min-w-0 max-w-full items-center gap-1">
          <agui-icon name="chevron_right" class="text-agui-muted" aria-hidden="true"></agui-icon>
          <agui-button class="agui-button-ghost h-auto min-h-8 min-w-0 max-w-full px-1.5 py-1 text-agui-muted hover:underline aria-[current=location]:font-medium aria-[current=location]:text-agui-accent"
            bind="$.value: value; @aria-current: current; @disabled: disabled; onclick: select">
            <agui-icon bind="$.name: ^icon; hidden: !^icon"></agui-icon>
            <span class="whitespace-normal break-all text-start">{{^label}}</span>
          </agui-button>
        </li>
      </template>
    </ol>
  </nav>
`;
