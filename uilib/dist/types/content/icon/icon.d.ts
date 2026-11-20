import { UiComponent } from '../../shared/component.js';
import { ICON_TEMPLATE } from './template.js';
import styles from './styles.js';
export declare class Icon extends UiComponent {
    init$: {
        name: undefined;
        glyph: string;
        fontReady: boolean;
    };
    renderCallback(): void;
    refreshGlyph: () => void;
}
export declare namespace Icon {
    export { ICON_TEMPLATE as template };
    export { styles as rootStyles };
}
