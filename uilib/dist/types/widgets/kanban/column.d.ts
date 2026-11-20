import { UiComponent } from '../../shared/component.js';
import { KANBAN_COLUMN_TEMPLATE } from './template.js';
export declare class KanbanColumn extends UiComponent {
    init$: {
        id: string;
        label: string;
        statusValue: boolean;
        unassigned: boolean;
        tone: boolean;
        count: number;
        countLabel: string;
        emptyLabel: string;
        empty: boolean;
        cards: never[];
    };
    constructor();
}
export declare namespace KanbanColumn {
    export { KANBAN_COLUMN_TEMPLATE as template };
}
