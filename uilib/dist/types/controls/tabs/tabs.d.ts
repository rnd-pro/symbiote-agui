import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from '../../shared/component.js';
import { Tab } from './tab.js';
import { TABS_TEMPLATE } from './template.js';
import styles from './styles.js';
export declare class Tabs extends UiComponent {
    componentDescription: () => string;
    ready: boolean;
    focusValue: string;
    /** @type {MutationObserver | undefined} */
    panelObserver: MutationObserver | undefined;
    init$: {
        value: undefined;
        label: undefined;
        orientation: undefined;
        disabled: undefined;
        readonly: undefined;
        activeValue: string;
        buttons: never[];
        listLabel: string;
        listOrientation: string;
        selectTab: (/** @type {unknown} */ value: unknown) => {
            value: string;
            changed: boolean;
        };
        set_value: ToolDescriptor;
        read_value: ToolDescriptor;
    };
    constructor();
    renderCallback(): void;
    get panels(): Tab[];
    get unavailable(): boolean;
    refresh(): void;
    get buttons(): HTMLButtonElement[];
    /**
     * @param {unknown} value
     */
    commit(value: unknown): {
        value: string;
        changed: boolean;
    };
    /**
     * @param {KeyboardEvent} event
     */
    onKeydown: (event: KeyboardEvent) => void;
    /**
     * @param {FocusEvent} event
     */
    onFocusout: (event: FocusEvent) => void;
    destroyCallback(): void;
}
export declare namespace Tabs {
    export { TABS_TEMPLATE as template };
    export { styles as rootStyles };
}
