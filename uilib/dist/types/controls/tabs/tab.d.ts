import { UiComponent } from '../../shared/component.js';
export declare class Tab extends UiComponent {
    processInnerHtml: boolean;
    ready: boolean;
    buttonId: string;
    init$: {
        value: undefined;
        label: undefined;
        disabled: undefined;
    };
    renderCallback(): void;
    get definition(): {
        value: string;
        label: string;
        disabled: boolean;
    };
    refreshOwner(): void;
    destroyCallback(): void;
}
