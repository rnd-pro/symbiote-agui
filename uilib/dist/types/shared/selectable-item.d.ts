/**
 * @param {MouseEvent} event
 * @param {HTMLElement} element
 */
export declare function isItemSelectionClick(event: MouseEvent, element: HTMLElement): boolean;
/**
 * Bind whole-item selection without intercepting embedded controls or text selection.
 *
 * @param {HTMLElement} element
 * @param {() => boolean} enabled
 * @param {() => unknown} select
 */
export declare function bindItemSelection(element: HTMLElement, enabled: () => boolean, select: () => unknown): () => void;
