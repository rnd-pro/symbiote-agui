/**
 * @param {import('./component.js').UiComponent} component
 * @param {import('../types/uilib.js').UiControl} control
 * @param {readonly string[]} attributes
 */
export declare function bindControlAttributes(component: import('./component.js').UiComponent, control: import('../types/uilib.js').UiControl, attributes: readonly string[]): void;
/**
 * Transfer native attributes without leaving duplicate IDs, focus targets, or styles.
 * The wrapper routes later attribute API calls to its control.
 *
 * @param {HTMLElement} source
 * @param {HTMLElement} control
 * @param {ReadonlySet<string>} retained
 */
export declare function transferControlAttributes(source: HTMLElement, control: HTMLElement, retained: ReadonlySet<string>): MutationObserver;
