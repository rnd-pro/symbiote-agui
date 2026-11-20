import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
/** @param {import('./map.js').AguiMap} map */
export declare function mapTools(map: import('./map.js').AguiMap): {
    set_selection: ToolDescriptor;
    set_view: ToolDescriptor;
    fit_records: ToolDescriptor;
    read_view: ToolDescriptor;
};
