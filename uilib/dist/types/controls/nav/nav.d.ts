import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from '../../shared/component.js';
import { NAV_TEMPLATE } from './template.js';
import styles from './styles.js';
export declare class Nav extends UiComponent {
    ready: boolean;
    componentDescription: () => string;
    init$: {
        items: never[];
        routes: undefined;
        value: undefined;
        label: undefined;
        disabled: undefined;
        readonly: undefined;
        activeValue: string;
        section: string;
        sectionName: string;
        sectionIcon: string;
        sectionSrc: string;
        entries: never[];
        navigationLabel: string;
        navigationLabelledBy: boolean;
        set_value: ToolDescriptor;
        read_value: ToolDescriptor;
    };
    renderCallback(): void;
    get unavailable(): boolean;
    get defaultValue(): string;
    get currentKind(): string;
    get items(): import('../../types/uilib.js').UiNavItem[];
    refresh(): void;
    /** @param {unknown} value */
    commit(value: unknown): {
        value: string;
        changed: boolean;
    };
    destroyCallback(): void;
}
export declare namespace Nav {
    export { NAV_TEMPLATE as template };
    export { styles as rootStyles };
}
