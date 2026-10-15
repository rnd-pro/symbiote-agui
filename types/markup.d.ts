import type { Readable } from 'node:stream';

export type MarkupInput = Readable & { isTTY?: boolean };

export interface StyleCompiler {
  build(candidates: string[]): string;
}

export interface MarkupUpdate {
  html: string;
  stylesheetUrl: string;
  pageUrl: string;
  contentRootId: string;
  stylesheetId: string;
  stylesheetTimeout: number;
}
