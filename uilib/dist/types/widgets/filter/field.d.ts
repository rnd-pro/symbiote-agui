import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from '../../shared/component.js';
import { FILTER_FIELD_TEMPLATE } from './template.js';
export declare class FilterField extends UiComponent {
    refreshing: boolean;
    componentDescription: () => string;
    init$: {
        id: string;
        fieldKey: string;
        label: string;
        minLabel: string;
        maxLabel: string;
        allLabel: string;
        isContains: boolean;
        isEquals: boolean;
        isRange: boolean;
        rangeType: string;
        filterValue: string;
        options: never[];
        containsValue: string;
        equalsValue: string;
        minValue: string;
        maxValue: string;
        rangeStep: string;
        selectOptions: never[];
        unavailable: boolean;
        set_filter: ToolDescriptor;
    };
    renderCallback(): void;
    refresh(): void;
    /** @param {unknown} value */
    edit(value: unknown): {
        changed: boolean;
        resultCount: number;
    };
    onInput: () => void;
}
export declare namespace FilterField {
    export { FILTER_FIELD_TEMPLATE as template };
}
