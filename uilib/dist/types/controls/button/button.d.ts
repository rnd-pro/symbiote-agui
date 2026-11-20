import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { AttributeHost } from './attribute-host.js';
import { BUTTON_TEMPLATE } from './template.js';
import styles from './styles.js';
export declare class Button extends AttributeHost {
    disposed: boolean;
    /** @type {MutationObserver | undefined} */
    forwardedAttributes: MutationObserver | undefined;
    /** @type {MutationObserver | undefined} */
    controlObserver: MutationObserver | undefined;
    componentDescription: () => string;
    init$: {
        value: undefined;
        loading: undefined;
        buttonLoading: boolean;
        buttonBusy: string;
        unavailable: boolean;
        activate: ToolDescriptor;
    };
    constructor();
    get actionId(): string;
    get unavailable(): boolean;
    renderCallback(): void;
    activate(): {
        activated: boolean;
    };
    /** @param {MouseEvent} event */
    blockLoadingClick: (event: MouseEvent) => void;
    destroyCallback(): void;
}
export declare namespace Button {
    export { BUTTON_TEMPLATE as template };
    export { styles as rootStyles };
}
