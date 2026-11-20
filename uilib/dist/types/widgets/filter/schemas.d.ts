export declare let FILTER_VALUE_SCHEMA: {
    anyOf: ({
        type: string;
        maxLength: 2048;
        properties?: undefined;
        additionalProperties?: undefined;
    } | {
        type: string;
        properties: {
            [k: string]: {
                anyOf: ({
                    type: string;
                    maxLength?: undefined;
                } | {
                    type: string;
                    maxLength: 2048;
                })[];
            };
        };
        maxLength?: undefined;
        additionalProperties: boolean;
    })[];
};
