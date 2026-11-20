import { UiComponent } from '../../shared/component.js';
import { STEPS_TEMPLATE } from './template.js';
import styles from './styles.js';
export declare class Steps extends UiComponent {
    init$: {
        items: never[];
        value: undefined;
        complete: undefined;
        label: undefined;
        texts: {};
        entries: never[];
        progressLabel: string;
        progressLabelledBy: string;
        statusState: string;
        statusMessage: string;
        '+renderInput': () => any[];
    };
    renderCallback(): void;
    /** @param {string} key */
    text(key: string): string;
    refresh(): void;
}
export declare namespace Steps {
    export { STEPS_TEMPLATE as template };
    export { styles as rootStyles };
}
