import { UiComponent } from '../../shared/component.js';
import styles from './styles.js';
export declare class Header extends UiComponent {
    processInnerHtml: boolean;
    /** @type {ResizeObserver | undefined} */
    sizeObserver: ResizeObserver | undefined;
    /** @type {HTMLElement | undefined} */
    spacingTarget: HTMLElement | undefined;
    renderCallback(): void;
    updateSpacing(): void;
    destroyCallback(): void;
}
export declare namespace Header {
    export { styles as rootStyles };
}
