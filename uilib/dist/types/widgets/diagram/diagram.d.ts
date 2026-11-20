import { UiComponent } from '../../shared/component.js';
import { DIAGRAM_TEMPLATE } from './template.js';
import styles from './styles.js';
export declare class Diagram extends UiComponent {
    svgPrefix: string;
    /** @type {typeof import('./runtime/index.js') | undefined} */
    runtime: typeof import('./runtime/index.js') | undefined;
    disposed: boolean;
    loadFailed: boolean;
    scheduled: boolean;
    revision: number;
    init$: {
        value: string;
        label: undefined;
        description: undefined;
        loading: undefined;
        error: undefined;
        texts: {};
        diagramLabel: string;
        diagramDescription: string;
        statusState: string;
        statusMessage: string;
        busyText: string;
        plotHidden: boolean;
        sourceLabel: string;
        sourceText: string;
        hasSource: boolean;
    };
    renderCallback(): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    loadRuntime(): Promise<void>;
    /** @param {string} key */
    text(key: string): string;
    refresh(): void;
    /** @param {number} revision */
    draw(revision: number): Promise<void>;
    destroyCallback(): void;
}
export declare namespace Diagram {
    export { DIAGRAM_TEMPLATE as template };
    export { styles as rootStyles };
}
