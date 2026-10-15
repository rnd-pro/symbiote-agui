// Version 4.3.3 references unpublished internal declaration files. Keep the consumed API explicit.
declare module '@tailwindcss/node' {
  export function compile(css: string, options: {
    base: string;
    onDependency: (path: string) => void;
  }): Promise<import('./markup.js').StyleCompiler>;
}
