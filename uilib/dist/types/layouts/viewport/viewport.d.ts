import { UiComponent } from '../../shared/component.js';
import styles from './styles.js';
export declare class Viewport extends UiComponent {
    processInnerHtml: boolean;
    renderCallback(): void;
}
export declare namespace Viewport {
    export { styles as rootStyles };
}
