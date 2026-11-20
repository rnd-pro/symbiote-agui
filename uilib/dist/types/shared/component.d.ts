import { BaseClass } from '@symbiotejs/symbiote/html-app';
export declare class UiComponent extends BaseClass {
    processInnerHtml: boolean;
    allowCustomTemplate: boolean;
    get actionId(): string;
    /**
     * @param {import('../types/uilib.js').UiAction['action']} action
     * @param {import('../types/uilib.js').UiValue} [value]
     */
    announce(action: import('../types/uilib.js').UiAction['action'], value?: import('../types/uilib.js').UiValue): boolean;
}
