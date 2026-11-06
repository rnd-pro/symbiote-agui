import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from '../../shared/component.js';
import { TAB_BUTTON_TEMPLATE } from './template.js';

/** Internal Itemize item; authored panels use agui-tab. */
export class TabButton extends UiComponent {
  componentDescription = () => JSON.stringify({
    tabsId: this.closest('agui-tabs')?.id || '',
    value: this.$.value,
    label: this.$.label,
  });
  init$ = {
    id: '',
    value: '',
    label: '',
    disabled: false,
    selected: 'false',
    tabIndex: -1,
    panelId: '',
    select: new ToolDescriptor({
      description: 'Select this tab without returning unrelated application state.',
      deps: [
        'disabled',
        'label',
        'value',
      ],
      when: () => !this.$.disabled,
      execute: () => {
        let select = /** @type {import('./tabs.js').Tabs['commit']} */ (this.$['^selectTab']);
        return select(this.$.value);
      },
    }),
  };
}

TabButton.template = TAB_BUTTON_TEMPLATE;
