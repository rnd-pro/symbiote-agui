import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
/** @param {import('./chart.js').Chart} chart */
export declare function chartTools(chart: import('./chart.js').Chart): {
    set_selection: ToolDescriptor;
    read_view: ToolDescriptor;
    read_selection: ToolDescriptor;
};
