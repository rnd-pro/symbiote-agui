export let CLOUDFLARED_VERSION = '2026.10.1';
export let TUNNEL_START_TIMEOUT_MS = 90_000;
export let TUNNEL_REQUEST_TIMEOUT_MS = TUNNEL_START_TIMEOUT_MS + 10_000;
export let TUNNEL_STOP_TIMEOUT_MS = 3_000;
export let MAX_DOWNLOAD_BYTES = 128 * 1024 * 1024;

export let CLOUDFLARED_ASSETS = Object.freeze({
  'darwin-x64': { name: 'cloudflared-darwin-amd64.tgz', sha256: '3b0dbaf378337e9d7fb6cd235a76d1d6a7dee434c2d8edf9281164fb6a3837ab' },
  'darwin-arm64': { name: 'cloudflared-darwin-arm64.tgz', sha256: '647615df99d49cd179ea5e13ef760b9bbfb33630f6ae62f87e33dfadda60adcc' },
  'linux-x64': { name: 'cloudflared-linux-amd64', sha256: '3bfc539f45d2620c71debb7a86be0efa737ed5ccbad9eb85c787116900e5c586' },
  'linux-arm64': { name: 'cloudflared-linux-arm64', sha256: '2c65dfabf616c40efc7545d107d7a57ad5e21377e2964b7e88af19a238074a46' },
  'win32-x64': { name: 'cloudflared-windows-amd64.exe', sha256: '4d2490e74082c5d48dbfedaf92576fa5bd1702379ab88eb7faa0cfbe8dc891b6' },
});
