export let ASSET_PATH = '_assets';

export let ASSET_LIMITS = Object.freeze({
  fileBytes: 16 * 1024 * 1024,
  totalBytes: 128 * 1024 * 1024,
  files: 512,
  entries: 2048,
  depth: 32,
  pathLength: 1024,
  segmentLength: 255,
  pageSize: 20,
  maxPageSize: 100,
  concurrentRequests: 8,
  timeoutMs: 30_000,
});

/** @type {Readonly<Record<string, string>>} */
export let ASSET_TYPES = Object.freeze({
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.ico': 'image/vnd.microsoft.icon',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.markdown': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
});
