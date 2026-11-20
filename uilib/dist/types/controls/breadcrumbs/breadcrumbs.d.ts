import { Nav } from '../nav/nav.js';
import { BREADCRUMBS_TEMPLATE } from './template.js';
import styles from './styles.js';
export declare class Breadcrumbs extends Nav {
    /**
     * @param {string | DocumentFragment} [template]
     * @param {boolean} [shadow]
     */
    render(template?: string | DocumentFragment, shadow?: boolean): void;
    get defaultValue(): string;
    get currentKind(): string;
}
export declare namespace Breadcrumbs {
    export { BREADCRUMBS_TEMPLATE as template };
    export { styles as rootStyles };
}
