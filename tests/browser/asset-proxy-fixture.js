import { readFile } from 'node:fs/promises';
import { reserveSession } from '../../src/sessions/store.js';
import { prepareCachedMarkup } from '../../src/sessions/cache.js';
import { SessionRuntime } from '../../src/sessions/runtime.js';
import { temporaryState } from '../node/state-fixture.js';
import { upstreamResponse, waitForAbort } from '../node/proxy-http-fixture.js';
import { MARKDOWN_LIMITS } from '../../src/page/client/uilib/widgets/markdown/constants.js';
import { tunnelProxy } from './tunnel-proxy.js';

/** @param {import('node:test').TestContext} t */
export async function assetProxyFixture(t) {
  let state = await temporaryState();
  let tunnel = await tunnelProxy();
  let record = await reserveSession('asset-proxy');
  let runtime = new SessionRuntime(record);
  let image = await readFile(new URL('../../node_modules/leaflet/dist/images/marker-icon.png', import.meta.url));
  /** @type {string[]} */
  let upstreamRequests = [];
  /** @type {Map<string, ReturnType<typeof Promise.withResolvers>>} */
  let started = new Map();
  /** @type {Map<string, ReturnType<typeof Promise.withResolvers>>} */
  let cancelled = new Map();
  t.after(async () => {
    await runtime.close();
    await tunnel.close();
    await state.close();
  });
  let saved = await prepareCachedMarkup(record.sessionId, '<p>Asset proxy fixture</p>');
  try { await saved.commit(); }
  finally { await saved.discard(); }
  await runtime.start(new AbortController().signal);
  await runtime.changeProxy({
    command: 'allow',
    origin: 'https://assets.test',
  });
  let proxy = runtime.assetProxy;
  let pages = runtime.pages;
  let access = runtime.access;
  if (!proxy || !pages || !access || !record.url) { throw new Error('Proxy fixture did not initialize.'); }
  proxy.resolve = async () => [
    {
      address: '93.184.215.14',
      family: 4,
    },
  ];

  /** @param {string} pathname */
  function asset(pathname) {
    let assets = {
      '/records.json': {
        type: 'application/json',
        body: '{"records":[{"id":"one","label":"Example"}]}',
      },
      '/feed.xml': {
        type: 'application/rss+xml',
        body: '<rss><channel><title>Example feed</title><item><title>News</title></item></channel></rss>',
      },
      '/image.png': {
        type: 'image/png',
        body: image,
      },
      '/docs/final.md': {
        type: 'text/markdown',
        body: '# Proxied notes\n\n[Next document](next.md)\n\n<figure><img src="cover.png" alt="Cover"></figure>\n\n<script>window.proxyInjected = true;</script>\n',
      },
      '/fast.md': {
        type: 'text/markdown',
        body: '# Updated source\n\n[Next document](next.md)',
      },
      '/large.md': {
        type: 'text/markdown',
        body: 'x'.repeat(MARKDOWN_LIMITS.inputBytes + 1),
      },
    };
    let key = pathname === '/docs/cover.png' ? '/image.png' : pathname;
    return assets[/** @type {keyof typeof assets} */ (key)] || {
      type: 'text/markdown',
      body: '# Remote notes',
    };
  }

  proxy.open = async ({ url }, _method, signal) => {
    upstreamRequests.push(url.pathname);
    if (url.pathname === '/slow.md' || url.pathname === '/removed.md') {
      started.get(url.pathname)?.resolve(undefined);
      try { return await waitForAbort(signal); }
      finally { cancelled.get(url.pathname)?.resolve(undefined); }
    }
    if (url.pathname === '/redirect.md') { return upstreamResponse('', {
      location: '/docs/final.md',
    }, 302); }
    let result = asset(url.pathname);
    return upstreamResponse(result.body, {
      'content-type': result.type,
    });
  };
  access.sharing = true;
  access.publicOrigin = tunnel.origin;
  pages.shared.enable(runtime.revision);
  tunnel.setTarget(record.url);
  return {
    runtime,
    upstreamRequests,
    asset,
    localUrl: record.url,
    publicUrl: `${tunnel.origin}${access.path}`,
    viewerUrl: `${tunnel.origin}${access.path}?mode=viewer`,
    /** @param {string} pathname */
    expectCancellation(pathname) {
      let begin = Promise.withResolvers();
      let cancel = Promise.withResolvers();
      started.set(pathname, begin);
      cancelled.set(pathname, cancel);
      return {
        started: begin.promise,
        cancelled: cancel.promise,
      };
    },
  };
}
