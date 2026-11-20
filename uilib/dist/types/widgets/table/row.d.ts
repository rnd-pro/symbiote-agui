import { UiComponent } from '../../shared/component.js';
import { TABLE_ROW_TEMPLATE } from './template.js';
export declare class TableRow extends UiComponent {
    clearSelectionListeners: (() => void) | undefined;
    init$: {
        id: string;
        rowId: string;
        cells: never[];
        selectionType: string;
        selected: boolean;
        selectable: boolean;
        selectedText: boolean;
        tabIndex: number;
    };
    constructor();
    renderCallback(): void;
    select(): {
        changed: boolean;
        selectedCount: number;
        filteredCount: number;
        page: number;
    } | undefined;
    destroyCallback(): void;
}
export declare namespace TableRow {
    export { TABLE_ROW_TEMPLATE as template };
}
