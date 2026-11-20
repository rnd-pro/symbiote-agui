import { UiComponent } from '../../shared/component.js';
import { MARKDOWN_TEMPLATE } from './template.js';
import styles from './styles.js';
export declare class Markdown extends UiComponent {
    headingPrefix: string;
    /** @type {typeof import('./runtime/index.js') | undefined} */
    runtime: typeof import('./runtime/index.js') | undefined;
    loadFailed: boolean;
    disposed: boolean;
    revision: number;
    scheduled: boolean;
    sourceUrl: string;
    sourceBaseUrl: string;
    sourceValue: string;
    sourceIssue: string;
    sourceLoading: boolean;
    /** @type {AbortController | undefined} */
    sourceController: AbortController | undefined;
    init$: {
        value: string;
        extensions: boolean;
        texts: {};
        label: undefined;
        src: undefined;
        loading: undefined;
        error: undefined;
        statusMessage: string;
        statusState: string;
        documentLabel: string;
        busy: boolean;
        contentHidden: boolean;
    };
    renderCallback(): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    loadRuntime(): Promise<void>;
    /** @param {string} key */
    text(key: string): string;
    refresh(): void;
    stopSource(): void;
    /** @param {string} url */
    loadSource(url: string): Promise<void>;
    readSource(): {
        value: any;
        issue: string;
        loading: boolean;
    };
    /** @param {number} revision */
    renderDocument(revision: number): Promise<void>;
    destroyCallback(): void;
}
export declare namespace Markdown {
    export { MARKDOWN_TEMPLATE as template };
    export { styles as rootStyles };
}
