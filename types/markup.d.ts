import type { Readable } from 'node:stream';

export type MarkupInput = Readable & { isTTY?: boolean };

export interface StyleCompiler {
  build(candidates: string[]): string;
}
