import { UiComponent } from '../../shared/component.js';
import { LIST_TEMPLATE } from './template.js';
import styles from './styles.js';
export declare class List extends UiComponent {
    /** @type {HTMLTemplateElement | undefined} */
    inlineTemplate: HTMLTemplateElement | undefined;
    /** @type {HTMLTemplateElement | undefined} */
    itemTemplate: HTMLTemplateElement | undefined;
    /** @type {ElementInternals | undefined} */
    semantics: ElementInternals | undefined;
    /** @type {import('../../types/uilib-list.js').UiListModel | undefined} */
    model: import('../../types/uilib-list.js').UiListModel | undefined;
    issue: string;
    disposed: boolean;
    handledEvents: WeakSet<WeakKey>;
    componentDescription: () => string;
    init$: {
        set_selection: import("@symbiotejs/symbiote/webmcp").ToolDescriptor;
        items: never[];
        value: never[];
        filteredIds: null;
        texts: {};
        itemsToRender: never[];
        unavailable: boolean;
        selectionEnabled: boolean;
        selectItem: (/** @type {import('../../types/uilib-list.js').UiListSelectionEvent} */ event: import('../../types/uilib-list.js').UiListSelectionEvent) => {
            changed: boolean;
            selectedCount: number;
            filteredCount: number;
        };
    };
    /**
     * @param {string | DocumentFragment} [template]
     * @param {boolean} [shadow]
     */
    render(template?: string | DocumentFragment, shadow?: boolean): void;
    resolveTemplate(): HTMLTemplateElement | undefined;
    renderCallback(): void;
    /** @returns {import('../../types/uilib-list.js').UiListState} */
    stateInput(): import('../../types/uilib-list.js').UiListState;
    refresh(): void;
    /** @param {string} key */
    text(key: string): string;
    /** @param {import('../../types/uilib-list.js').UiListState} state */
    deriveModel(state: import('../../types/uilib-list.js').UiListState): import("../../types/uilib-list.js").UiListModel;
    requireModel(): import("../../types/uilib-list.js").UiListModel;
    /** @param {string[]} ids */
    edit(ids: string[]): {
        changed: boolean;
        selectedCount: number;
        filteredCount: number;
    };
    /** @param {boolean} changed */
    result(changed: boolean): {
        changed: boolean;
        selectedCount: number;
        filteredCount: number;
    };
    /** @param {MouseEvent} event */
    onClick: (event: MouseEvent) => void;
    /** @param {import('../../types/uilib-list.js').UiListSelectionEvent} event */
    selectItem(event: import('../../types/uilib-list.js').UiListSelectionEvent): {
        changed: boolean;
        selectedCount: number;
        filteredCount: number;
    };
    destroyCallback(): void;
}
export declare namespace List {
    export { LIST_TEMPLATE as template };
    export { styles as rootStyles };
}
