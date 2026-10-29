export interface ProxyPolicy {
  version: 1;
  allowedOrigins: string[];
}

export type ProxyChange = {
  command: 'allow' | 'remove';
  origin: string;
};

export interface ProxyStatus {
  enabled: boolean;
  available: boolean;
  policy: ProxyPolicy;
  path: string;
  urlTemplate: string;
  limits: typeof import('../src/proxy/constants.js').PROXY_LIMITS;
}

export type ProxyCliRequest = {
  kind: 'proxy';
  sessionId: string;
} & ({ command: 'status' } | ProxyChange);

export type ProxyLimits = {
  readonly [Key in keyof typeof import('../src/proxy/constants.js').PROXY_LIMITS]: number;
};

export interface ProxyDestination {
  url: URL;
  address: import('node:dns').LookupAddress;
}

export interface ProxyDependencies {
  resolve?(hostname: string, signal: AbortSignal): Promise<import('node:dns').LookupAddress[]>;
  open?(destination: ProxyDestination, method: string, signal: AbortSignal): Promise<import('node:http').IncomingMessage>;
  limits?: Partial<ProxyLimits>;
  now?(): number;
}
