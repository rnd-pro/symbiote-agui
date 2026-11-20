import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from '../../shared/component.js';
import { TAB_BUTTON_TEMPLATE } from './template.js';
/** Internal Itemize item; authored panels use agui-tab. */
export declare class TabButton extends UiComponent {
    componentDescription: () => string;
    init$: {
        id: string;
        value: string;
        label: string;
        disabled: boolean;
        selected: string;
        tabIndex: number;
        panelId: string;
        select: ToolDescriptor;
    };
}
export declare namespace TabButton {
    export { TAB_BUTTON_TEMPLATE as template };
}
