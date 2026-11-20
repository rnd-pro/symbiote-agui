import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from './component.js';
export declare class Control extends UiComponent {
    /** @type {import('../types/uilib.js').UiControl | undefined} */
    control: import('../types/uilib.js').UiControl | undefined;
    descriptionIds: string;
    init$: {
        value: undefined;
        label: undefined;
        hint: undefined;
        error: undefined;
        requiredMark: undefined;
        fieldRequiredMark: string;
        disabled: undefined;
        readonly: undefined;
        required: undefined;
        fieldLabel: string;
        fieldHint: string;
        fieldError: string;
        fieldDisabled: boolean;
        fieldReadonly: boolean;
        fieldRequired: boolean;
        set_value: ToolDescriptor;
        clear_value: ToolDescriptor;
        read_value: ToolDescriptor;
    };
    get isCheckbox(): boolean;
    get isBoolean(): boolean;
    renderCallback(): void;
    /**
     * @param {string} key
     * @param {() => unknown} fallback
     * @param {(value: unknown) => void} handler
     */
    watchControlState(key: string, fallback: () => unknown, handler: (value: unknown) => void): void;
    setAvailability(): void;
    /** @param {unknown} value */
    showValue(value: unknown): void;
    describe(): void;
    /** @param {unknown} value */
    commit(value: unknown): {
        value: unknown;
        changed: boolean;
    };
    onInput: () => void;
    onValidity: () => void;
    destroyCallback(): void;
}
