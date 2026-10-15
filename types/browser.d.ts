export type BrowserOptions =
  | { mode: 'managed'; channel: 'chrome'; executablePath?: never }
  | { mode: 'managed'; executablePath: string; channel?: never }
  | { mode: 'attached'; cdpUrl: string };

export interface BrowserVersion {
  webSocketDebuggerUrl?: string;
}
