import { Control } from '../../shared/control.js';
import { SELECT_TEMPLATE } from './template.js';
export declare class Select extends Control {
    constructor();
    renderCallback(): void;
    renderOptions(): void;
    /** @param {unknown} value */
    commit(value: unknown): {
        value: unknown;
        changed: boolean;
    };
}
export declare namespace Select {
    export { SELECT_TEMPLATE as template };
}
