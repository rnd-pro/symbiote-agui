import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from '../../shared/component.js';
import { STATE_TEMPLATE } from './template.js';
import styles from './styles.js';
export declare class State extends UiComponent {
    init$: {
        status: undefined;
        message: undefined;
        retryLabel: undefined;
        stateHidden: boolean;
        stateRole: string;
        stateBusy: string;
        stateMessage: string;
        stateRetryLabel: string;
        retryVisible: boolean;
        stateLoading: boolean;
        retry: ToolDescriptor;
    };
    renderCallback(): void;
    refresh(): void;
}
export declare namespace State {
    export { STATE_TEMPLATE as template };
    export { styles as rootStyles };
}
