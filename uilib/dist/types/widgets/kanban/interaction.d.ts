export declare class KanbanInteraction {
    board: import("./kanban.js").Kanban;
    handlers: {
        dragstart: (event: Event) => void;
        dragover: (event: Event) => void;
        dragleave: (event: Event) => void;
        drop: (event: Event) => void;
        dragend: () => void;
        keydown: (event: Event) => void;
    };
    /** @type {{ id: string; element: HTMLElement } | undefined} */
    drag: {
        id: string;
        element: HTMLElement;
    } | undefined;
    /** @type {HTMLElement | undefined} */
    target: HTMLElement | undefined;
    /** @param {import('./kanban.js').Kanban} board */
    constructor(board: import('./kanban.js').Kanban);
    /**
     * @param {Event} event
     * @param {string} selector
     */
    element(event: Event, selector: string): HTMLElement | undefined;
    /** @param {Event} event */
    onStart: (event: Event) => void;
    /** @param {Event} event */
    destination(event: Event): HTMLElement | undefined;
    /** @param {Event} event */
    onOver: (event: Event) => void;
    /** @param {Event} event */
    onLeave: (event: Event) => void;
    /** @param {Event} event */
    onDrop: (event: Event) => void;
    /** @param {Event} event */
    onKey: (event: Event) => void;
    cancel: () => void;
    destroy(): void;
}
