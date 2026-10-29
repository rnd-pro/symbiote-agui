const failures = Object.freeze({
  INVALID_REQUEST: {
    status: 400,
    message: 'Use one public HTTP(S) source URL without credentials or a request body.',
  },
  METHOD_DENIED: {
    status: 405,
    message: 'The asset proxy accepts GET and HEAD only.',
  },
  SOURCE_DENIED: {
    status: 403,
    message: 'This source origin is not enabled for the session.',
  },
  ORIGIN_DENIED: {
    status: 403,
    message: 'Load proxy assets from the session page origin.',
  },
  DESTINATION_DENIED: {
    status: 403,
    message: 'The source must resolve exclusively to public Internet addresses.',
  },
  TOO_LARGE: {
    status: 413,
    message: 'The upstream asset exceeds the proxy size limit.',
  },
  UNSUPPORTED_TYPE: {
    status: 415,
    message: 'The proxy supports JSON, Markdown, plain text, feeds, XML, and passive raster images.',
  },
  BUSY: {
    status: 429,
    message: 'The session has too many active asset requests. Retry later.',
  },
  RATE_LIMIT: {
    status: 429,
    message: 'The session asset request rate limit was reached. Retry later.',
  },
  UPSTREAM_FAILED: {
    status: 502,
    message: 'The upstream asset could not be retrieved.',
  },
  REDIRECT_DENIED: {
    status: 502,
    message: 'The source exceeded the redirect limit or redirected from HTTPS to HTTP.',
  },
  TIMEOUT: {
    status: 504,
    message: 'The upstream asset request timed out.',
  },
  STOPPED: {
    status: 503,
    message: 'The session asset proxy is stopping.',
  },
});

export class ProxyError extends Error {
  /** @param {keyof typeof failures} key */
  constructor(key) {
    super(failures[key].message);
    this.code = `PROXY_${key}`;
    this.status = failures[key].status;
  }
}
