import { Control } from '../../shared/control.js';
import { TOGGLE_TEMPLATE } from './template.js';
export declare class Toggle extends Control {
    static observedAttributes: string[];
    renderCallback(): void;
}
export declare namespace Toggle {
    export { TOGGLE_TEMPLATE as template };
}
