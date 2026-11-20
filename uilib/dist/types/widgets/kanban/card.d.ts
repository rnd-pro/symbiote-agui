import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from '../../shared/component.js';
import { KANBAN_CARD_TEMPLATE } from './template.js';
export declare class KanbanCard extends UiComponent {
    componentDescription: () => string;
    init$: {
        id: string;
        recordId: string;
        title: string;
        description: string;
        moveHint: string;
        tabIndex: number;
        disabledText: string;
        unavailable: boolean;
        unavailableMessage: string;
        set_status: ToolDescriptor;
    };
    /** @param {string} status */
    edit(status: string): {
        changed: boolean;
        recordId: string;
        status: string;
        totalCount: number;
    };
}
export declare namespace KanbanCard {
    export { KANBAN_CARD_TEMPLATE as template };
}
