import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
/** @param {import('./filter.js').Filter} filter */
export declare function filterTools(filter: import('./filter.js').Filter): {
    set_value: ToolDescriptor;
    set_query: ToolDescriptor;
    read_result: ToolDescriptor;
};
