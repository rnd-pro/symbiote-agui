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
