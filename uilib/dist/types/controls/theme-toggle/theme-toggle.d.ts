import { Control } from '../../shared/control.js';
import { THEME_TOGGLE_TEMPLATE } from './template.js';
export declare class ThemeToggle extends Control {
    /** @type {MediaQueryList | undefined} */
    schemeQuery: MediaQueryList | undefined;
    constructor();
    get isDark(): boolean;
    renderCallback(): void;
    setAvailability(): void;
    refreshSaveMessage: () => void;
    refreshChecked: () => void;
    refreshLabel: () => void;
    /** @param {unknown} value */
    commit(value: unknown): {
        value: unknown;
        changed: boolean;
    };
    destroyCallback(): void;
}
export declare namespace ThemeToggle {
    export { THEME_TOGGLE_TEMPLATE as template };
}
