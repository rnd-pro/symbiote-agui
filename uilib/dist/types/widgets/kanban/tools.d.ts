import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
/** @param {import('./kanban.js').Kanban} board */
export declare function kanbanTools(board: import('./kanban.js').Kanban): {
    move_item: ToolDescriptor;
    read_view: ToolDescriptor;
};
