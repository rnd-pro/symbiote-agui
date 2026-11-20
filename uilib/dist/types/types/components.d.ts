export type ComponentState = Record<string, unknown>;

export type ComponentHost = import('@symbiotejs/symbiote').Symbiote<ComponentState>;
