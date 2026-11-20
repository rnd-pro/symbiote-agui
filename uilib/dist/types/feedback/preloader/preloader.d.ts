import { UiComponent } from '../../shared/component.js';
import { PRELOADER_TEMPLATE } from './template.js';
import styles from './styles.js';
export declare class Preloader extends UiComponent {
    init$: {
        label: undefined;
        progressLabel: string;
        progressLabelledBy: string;
    };
    renderCallback(): void;
    describe: () => void;
}
export declare namespace Preloader {
    export { PRELOADER_TEMPLATE as template };
    export { styles as rootStyles };
}
