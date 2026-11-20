import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
/** @param {import('./table.js').Table} table */
export declare function tableTools(table: import('./table.js').Table): {
    set_selection: ToolDescriptor;
    set_sort: ToolDescriptor;
    set_page: ToolDescriptor;
    read_view: ToolDescriptor;
    read_selection: ToolDescriptor;
    previous_page: ToolDescriptor;
    next_page: ToolDescriptor;
};
