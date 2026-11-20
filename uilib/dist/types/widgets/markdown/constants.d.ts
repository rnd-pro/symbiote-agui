export declare let MARKDOWN_RUNTIME_PATH: string;
export declare let MARKDOWN_SANITIZER_PATH: string;
export declare let MARKDOWN_LIMITS: Readonly<{
    inputBytes: number;
    outputBytes: number;
    nodes: 5000;
    depth: 32;
    fetchTimeoutMs: 15000;
}>;
export declare let MARKDOWN_ATTRIBUTES: Readonly<{
    label: "label";
    src: "src";
    loading: "loading";
    error: "error";
}>;
