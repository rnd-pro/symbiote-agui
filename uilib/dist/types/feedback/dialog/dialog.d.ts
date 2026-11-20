import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from '../../shared/component.js';
import { DIALOG_TEMPLATE } from './template.js';
import styles from './styles.js';
export declare class Dialog extends UiComponent {
    componentDescription: () => string;
    disposed: boolean;
    init$: {
        value: undefined;
        label: undefined;
        openLabel: undefined;
        closeLabel: undefined;
        opened: boolean;
        openedText: string;
        surfaceId: string;
        dialogLabel: string;
        triggerLabel: string;
        dismissLabel: string;
        open: ToolDescriptor;
        close: ToolDescriptor;
        read_value: ToolDescriptor;
    };
    constructor();
    renderCallback(): void;
    refresh(): void;
    /**
     * @param {boolean} value
     */
    commit(value: boolean): {
        value: boolean;
        changed: boolean;
    };
    onClose: () => void;
    destroyCallback(): void;
}
export declare namespace Dialog {
    export { DIALOG_TEMPLATE as template };
    export { styles as rootStyles };
}
