/**
 * @param {HTMLElement} container
 * @param {{ select: (id: string) => void; view: (view: import('../../../types/uilib-map.js').UiMapView) => void; tileError: (failed: boolean) => void }} callbacks
 * @returns {import('../../../types/uilib-map.js').UiMapRenderer}
 */
export declare function createMapRenderer(container: HTMLElement, callbacks: {
    select: (id: string) => void;
    view: (view: import('../../../types/uilib-map.js').UiMapView) => void;
    tileError: (failed: boolean) => void;
}): import('../../../types/uilib-map.js').UiMapRenderer;
