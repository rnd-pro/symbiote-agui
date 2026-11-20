import { Control } from '../../shared/control.js';
export declare class Field extends Control {
    static observedAttributes: string[];
    constructor();
    /**
     * @param {string | DocumentFragment} [template]
     * @param {boolean} [shadow]
     */
    render(template?: string | DocumentFragment, shadow?: boolean): void;
    renderCallback(): void;
}
