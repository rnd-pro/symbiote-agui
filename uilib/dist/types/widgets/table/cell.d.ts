import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from '../../shared/component.js';
import { TABLE_CELL_TEMPLATE } from './template.js';
export declare class TableCell extends UiComponent {
    componentDescription: () => string;
    init$: {
        id: string;
        rowId: string;
        columnKey: string;
        headingId: string;
        text: string;
        tone: boolean;
        cellClass: string;
        isSelection: boolean;
        selected: boolean;
        selectionValue: boolean;
        '+selectionValue': () => string | boolean;
        selectionType: string;
        groupName: string;
        selectLabel: string;
        unavailable: boolean;
        set_selected: ToolDescriptor;
    };
    renderCallback(): void;
    /** @param {boolean} selected */
    select(selected: boolean): {
        changed: boolean;
        selectedCount: number;
        filteredCount: number;
        page: number;
    };
}
export declare namespace TableCell {
    export { TABLE_CELL_TEMPLATE as template };
}
