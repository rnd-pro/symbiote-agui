import { UiComponent } from '../../shared/component.js';
export declare let BUTTON_ATTRIBUTES: readonly string[];
export declare let RETAINED_ATTRIBUTES: Set<string>;
export declare class AttributeHost extends UiComponent {
    /** @type {HTMLButtonElement | undefined} */
    control: HTMLButtonElement | undefined;
    /** @param {string} name */
    attributeTarget(name: string): HTMLButtonElement | undefined;
    /** @param {string} name */
    getAttribute(name: string): string | null;
    /** @param {string} name */
    hasAttribute(name: string): boolean;
    /**
     * @param {string} name
     * @param {string} value
     */
    setAttribute(name: string, value: string): void;
    /** @param {string} name */
    removeAttribute(name: string): void;
    /**
     * @param {string} name
     * @param {boolean} [force]
     */
    toggleAttribute(name: string, force?: boolean): boolean;
}
