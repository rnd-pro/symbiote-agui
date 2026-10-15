declare module 'jsda-kit/server/JSDAServer.js' {
  // JSDA 1.6 forwards this value to Node's Server.listen() without conversion.
  export function createServer(options: { port: import('node:net').ListenOptions }): import('node:http').Server;
}

declare module 'jsda-kit/cfg' {
  let config: {
    dynamic: {
      baseDir: string;
      routes: string;
      cache: { inMemory: boolean; exclude: string[] };
    };
    minify: { html: boolean };
    log: boolean;
  };
  export default config;
}
