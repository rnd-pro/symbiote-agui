import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from '../../shared/component.js';
import { TABLE_HEADING_TEMPLATE } from './template.js';
export declare class TableHeading extends UiComponent {
    componentDescription: () => string;
    init$: {
        id: string;
        headingId: string;
        columnKey: string;
        label: string;
        sortable: boolean;
        ariaSort: boolean;
        sortIcon: string;
        selectAll: boolean;
        selectAllLabel: string;
        selected: boolean;
        selectionValue: boolean;
        mixed: boolean;
        unavailable: boolean;
        sort_column: ToolDescriptor;
        select_filtered: ToolDescriptor;
    };
    renderCallback(): void;
    selectFiltered(): {
        changed: boolean;
        selectedCount: number;
        filteredCount: number;
        page: number;
    };
}
export declare namespace TableHeading {
    export { TABLE_HEADING_TEMPLATE as template };
}
