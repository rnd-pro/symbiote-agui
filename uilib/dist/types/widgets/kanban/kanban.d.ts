import { UiComponent } from '../../shared/component.js';
import { KANBAN_TEMPLATE } from './template.js';
import styles from './styles.js';
import { KanbanInteraction } from './interaction.js';
export declare class Kanban extends UiComponent {
    componentDescription: () => string;
    /** @type {import('../../types/uilib-kanban.js').UiKanbanModel | undefined} */
    model: import('../../types/uilib-kanban.js').UiKanbanModel | undefined;
    /** @type {import('../../types/uilib-kanban.js').UiKanbanIssue | undefined} */
    issue: import('../../types/uilib-kanban.js').UiKanbanIssue | undefined;
    disposed: boolean;
    /** @type {KanbanInteraction | undefined} */
    interaction: KanbanInteraction | undefined;
    init$: {
        move_item: import("@symbiotejs/symbiote/webmcp").ToolDescriptor;
        read_view: import("@symbiotejs/symbiote/webmcp").ToolDescriptor;
        value: never[];
        columns: never[];
        texts: {};
        unavailable: boolean;
        modelValid: boolean;
        boardLabel: string;
        moveHint: string;
        busyText: string;
        surfaceHidden: boolean;
        statusMessage: string;
        statusState: string;
        columnItems: never[];
        moveItem: (
        /** @type {string} */ id: string, 
        /** @type {string} */ status: string) => {
            changed: boolean;
            recordId: string;
            status: string;
            totalCount: number;
        };
    };
    constructor();
    renderCallback(): void;
    /** @returns {import('../../types/uilib-kanban.js').UiKanbanState} */
    stateInput(): import('../../types/uilib-kanban.js').UiKanbanState;
    refresh(): void;
    /** @param {string} key */
    text(key: string): string;
    requireModel(): import("../../types/uilib-kanban.js").UiKanbanModel;
    /**
     * @param {string} id
     * @param {string} status
     */
    moveItem(id: string, status: string): {
        changed: boolean;
        recordId: string;
        status: string;
        totalCount: number;
    };
    /** @param {string} id */
    focusItem(id: string): void;
    destroyCallback(): void;
}
export declare namespace Kanban {
    export { KANBAN_TEMPLATE as template };
    export { styles as rootStyles };
}
