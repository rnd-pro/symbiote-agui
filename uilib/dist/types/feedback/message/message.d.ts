import { UiComponent } from '../../shared/component.js';
import { MESSAGE_TEMPLATE } from './template.js';
import styles from './styles.js';
export declare class Message extends UiComponent {
    /** @type {number | undefined} */
    timer: number | undefined;
    /** @type {ResizeObserver | undefined} */
    sizeObserver: ResizeObserver | undefined;
    generation: number;
    disposed: boolean;
    init$: {
        message: string;
        tone: string;
        timeout: number;
        closeLabel: string;
        messageRole: string;
        liveMode: string;
        iconName: string;
        dismiss: () => void;
    };
    renderCallback(): void;
    show(): void;
    /** @param {boolean} [immediate] */
    hide(immediate?: boolean): Promise<void>;
    destroyCallback(): void;
}
export declare namespace Message {
    export { MESSAGE_TEMPLATE as template };
    export { styles as rootStyles };
}
