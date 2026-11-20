import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from '../../shared/component.js';
import { THEME_SELECTOR_TEMPLATE } from './template.js';
import styles from './styles.js';
export declare let THEME_SELECTOR_ATTRIBUTE_BINDINGS: Readonly<{
    [k: string]: string;
}>;
export declare class ThemeSelector extends UiComponent {
    ready: boolean;
    componentDescription: () => string;
    init$: {
        value: undefined;
        label: undefined;
        texts: undefined;
        disabled: undefined;
        readonly: undefined;
        popupId: string;
        selectorLabel: string;
        activeValue: string;
        entries: never[];
        unavailable: boolean;
        saving: boolean;
        saveState: string;
        statusMessage: string;
        statusClass: string;
        set_value: ToolDescriptor;
        read_value: ToolDescriptor;
    };
    renderCallback(): void;
    /** @param {string} key */
    text(key: string): string;
    get unavailable(): boolean;
    refresh(): void;
    /** @param {unknown} value */
    commit(value: unknown): {
        value: string;
        changed: boolean;
    };
    /**
     * @param {string} value
     * @param {Event} event
     */
    choose(value: string, event: Event): Promise<void>;
    destroyCallback(): void;
}
export declare namespace ThemeSelector {
    export { THEME_SELECTOR_TEMPLATE as template };
    export { styles as rootStyles };
}
