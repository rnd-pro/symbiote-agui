import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from '../../shared/component.js';
import { SIDEBAR_TEMPLATE } from './template.js';
import styles from './styles.js';
export declare class Sidebar extends UiComponent {
    /** @type {MediaQueryList | undefined} */
    desktopQuery: MediaQueryList | undefined;
    /** @type {MutationObserver | undefined} */
    contentObserver: MutationObserver | undefined;
    init$: {
        value: undefined;
        label: undefined;
        expandLabel: undefined;
        collapseLabel: undefined;
        collapseEmpty: undefined;
        disabled: undefined;
        readonly: undefined;
        expanded: boolean;
        expandedText: string;
        sidebarLabel: string;
        toggleLabel: string;
        unavailable: boolean;
        contentId: string;
        set_value: ToolDescriptor;
        read_value: ToolDescriptor;
        toggle: ToolDescriptor;
    };
    constructor();
    renderCallback(): void;
    refreshLayout: () => void;
    /**
     * @param {Node} container
     * @returns {boolean}
     */
    hasContent(container: Node): boolean;
    refresh(): void;
    /**
     * @param {unknown} value
     */
    commit(value: unknown): {
        value: boolean;
        changed: boolean;
    };
    destroyCallback(): void;
}
export declare namespace Sidebar {
    export { SIDEBAR_TEMPLATE as template };
    export { styles as rootStyles };
}
