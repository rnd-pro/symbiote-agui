import { UiComponent } from '../../shared/component.js';
import { SIDEBAR_BLOCK_TEMPLATE } from './template.js';
import styles from './styles.js';
export declare class SidebarBlock extends UiComponent {
    init$: {
        label: undefined;
        active: undefined;
        blockLabel: string;
        inactive: boolean;
    };
    constructor();
    renderCallback(): void;
    refresh(): void;
}
export declare namespace SidebarBlock {
    export { SIDEBAR_BLOCK_TEMPLATE as template };
    export { styles as rootStyles };
}
