import assert from 'node:assert/strict';
import { lstat, mkdir, rename, symlink, link, unlink, writeFile, truncate } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { assetHttpFixture } from './assets-http-fixture.js';
import { requestProxy } from './proxy-http-fixture.js';
import { ASSET_LIMITS } from '../../src/assets/constants.js';

test('local HTTP assets preserve binary bytes and MIME types, support HEAD, and bypass JSDA execution', async (t) => {
  let fixture = await assetHttpFixture(t);
  let image = Buffer.from([
    0x89,
    0x50,
    0,
    0xff,
    0xfe,
    0x80,
  ]);
  await writeFile(join(fixture.directory, 'binary.png'), image);
  let response = await fetch(fixture.url('binary.png'));
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), image);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal(response.headers.get('content-length'), String(image.length));
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  let head = await fetch(fixture.url('binary.png'), {
    method: 'HEAD',
  });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-length'), String(image.length));
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  let samples = {
    'theme.css': 'body { color: red; }',
    'module.html.js': 'throw new Error("Never evaluate this on the host");',
    'data.json': '{"name":"Example"}',
    'brief.md': '# Brief\n\n![Logo](./logo.svg)',
    'plain.txt': '<script>this is plain text</script>',
    'font.woff2': 'font fixture bytes',
    'empty.txt': '',
    'logo dark.svg': '<svg/>',
  };
  for (let [
    name,
    content,
  ] of Object.entries(samples)) {
    await writeFile(join(fixture.directory, name), content);
    let result = await fetch(fixture.url(encodeURIComponent(name)));
    assert.equal(result.status, 200, name);
    assert.equal(await result.text(), content);
  }
  let module = await fetch(fixture.url('module.html.js'));
  assert.match(module.headers.get('content-type') || '', /^text\/javascript/);
  for (let name of [
    'fragment.html',
    'fragment.htm',
  ]) {
    let html = '<agui-panel>Fragment</agui-panel><script>window.assetScript = true;</script>';
    await writeFile(join(fixture.directory, name), html);
    let fragment = await fetch(fixture.url(name));
    assert.equal(fragment.status, 200);
    assert.equal(await fragment.text(), html);
    assert.equal(fragment.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert.equal(fragment.headers.get('x-content-type-options'), 'nosniff');
    assert.match(fragment.headers.get('content-security-policy') || '', /^sandbox;/);
  }
  let ranged = await fetch(fixture.url('binary.png'), {
    headers: {
      range: 'bytes=0-1',
    },
  });
  assert.equal(ranged.status, 200, 'Range requests receive the bounded complete asset.');
  assert.deepEqual(Buffer.from(await ranged.arrayBuffer()), image);
});

test('local asset responses restrict SVG documents while retaining original bytes and inline styles', async (t) => {
  let fixture = await assetHttpFixture(t);
  let svg = '<svg xmlns="http://www.w3.org/2000/svg"><style>path{fill:red}</style><script>parent.pwned=true</script><path d="M0 0h1v1z"/></svg>';
  await writeFile(join(fixture.directory, 'styled.svg'), svg);
  let response = await fetch(fixture.url('styled.svg'));
  assert.equal(await response.text(), svg);
  let policy = response.headers.get('content-security-policy') || '';
  assert.match(policy, /^sandbox;/);
  assert.match(policy, /default-src 'none'/);
  assert.match(policy, /style-src 'unsafe-inline'/);
  assert.doesNotMatch(policy, /allow-scripts|allow-same-origin/);
  assert.equal(response.headers.get('content-type'), 'image/svg+xml');
});

test('asset requests validate Host, Origin, Fetch Metadata, methods and bodies, including current tunnel origins', async (t) => {
  let fixture = await assetHttpFixture(t);
  for (let headers of /** @type {Record<string, string>[]} */ ([
    {
      host: 'evil.test',
    },
    {
      origin: 'https://evil.test',
    },
    {
      origin: 'null',
    },
    {
      'sec-fetch-site': 'cross-site',
    },
    {
      'sec-fetch-site': 'same-site',
    },
  ])) {
    let result = await requestProxy(fixture.url(), {
      headers,
    });
    assert.equal(result.status, 403);
  }
  let publicHeaders = {
    host: 'shared.test',
    origin: 'https://shared.test',
    'sec-fetch-site': 'same-origin',
  };
  assert.equal((await requestProxy(fixture.url(), {
    headers: publicHeaders,
  })).status, 200, 'Asset reads do not require a browser role or WebSocket.');
  fixture.access.publicOrigin = 'https://renewed.test';
  assert.equal((await requestProxy(fixture.url(), {
    headers: publicHeaders,
  })).status, 403);
  assert.equal((await requestProxy(fixture.url(), {
    headers: {
      host: 'renewed.test',
      origin: 'https://renewed.test',
    },
  })).status, 200);
  for (let method of [
    'POST',
    'PUT',
    'DELETE',
    'OPTIONS',
  ]) {
    let response = await fetch(fixture.url(), {
      method,
    });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET, HEAD');
  }
  assert.equal((await requestProxy(fixture.url(), {
    headers: {
      'content-length': '4',
    },
    body: 'data',
  })).status, 400);
});

test('raw asset paths reject traversal, double decoding, hidden files and directory access before normalization', async (t) => {
  let fixture = await assetHttpFixture(t);
  for (let path of [
    '../logo.svg',
    'images/../../logo.svg',
    '%2e%2e/logo.svg',
    '%252e%252e/logo.svg',
    'images%2flogo.svg',
    'images%5clogo.svg',
    '%2fUsers%2fsecret.svg',
    'a//logo.svg',
    'a/./logo.svg',
    '.env',
    'a/.git/config.txt',
    'CON.svg',
    'C:/secret.svg',
    'a%00.svg',
    '%E0%A4%A.svg',
    '%',
    'logo.svg/',
    'a'.repeat(ASSET_LIMITS.pathLength * 3 + 1),
  ]) {
    let result = await requestProxy(fixture.url(), {
      path: `${fixture.assets.prefix}${path}`,
    });
    assert.equal(result.status, 400, path);
    assert.doesNotMatch(result.body, new RegExp(fixture.directory));
  }
  for (let path of [
    '/desk/_assets',
    '/desk/_assets/',
    '/other/_assets/logo.svg',
    '/_assets/logo.svg',
    '/desk/assets/logo.svg',
    '/desk/_assets/missing.svg',
  ]) { assert.equal((await requestProxy(fixture.url(), {
    path,
  })).status, 404, path); }
  assert.equal((await fetch(fixture.url('program.exe'))).status, 415);
  await mkdir(join(fixture.directory, 'directory.svg'));
  assert.notEqual((await fetch(fixture.url('directory.svg'))).status, 200);
});

test('asset delivery rejects escaping links, replaced roots and manual trees exceeding shared limits', async (t) => {
  let fixture = await assetHttpFixture(t);
  let secret = join(fixture.directory, '..', 'secret.svg');
  await writeFile(secret, 'private');
  await symlink(secret, join(fixture.directory, 'linked.svg'));
  let linkResponse = await fetch(fixture.url('linked.svg'));
  assert.equal(linkResponse.status, 403);
  assert.doesNotMatch(await linkResponse.text(), /private|secret\.svg/);
  await unlink(join(fixture.directory, 'linked.svg'));
  await link(secret, join(fixture.directory, 'hard.svg'));
  assert.equal((await fetch(fixture.url('hard.svg'))).status, 403);
  await unlink(join(fixture.directory, 'hard.svg'));
  let large = join(fixture.directory, 'large.png');
  await writeFile(large, '');
  await truncate(large, ASSET_LIMITS.fileBytes + 1);
  assert.equal((await fetch(fixture.url())).status, 413);
  await unlink(large);
  await rename(fixture.directory, `${fixture.directory}-old`);
  await mkdir(fixture.directory);
  await writeFile(join(fixture.directory, 'logo.svg'), 'replacement');
  assert.equal((await fetch(fixture.url())).status, 403);
  assert.equal(fixture.assets.status().available, false);
  assert.equal((await lstat(join(`${fixture.directory}-old`, 'logo.svg'))).isFile(), true);
});

test('normal refetch sees imported replacements and removals without replacing the session asset root', async (t) => {
  let fixture = await assetHttpFixture(t);
  let original = await fetch(fixture.url());
  assert.equal(await original.text(), fixture.bytes.toString());
  await writeFile(fixture.source, '<svg id="updated"/>');
  await fixture.run([
    'add',
    'desk',
    '--file',
    fixture.source,
    '--replace',
  ]);
  assert.equal(await (await fetch(fixture.url('logo.svg?revision=2'))).text(), '<svg id="updated"/>');
  await fixture.run([
    'remove',
    'desk',
    '--path',
    'logo.svg',
  ]);
  assert.equal((await fetch(fixture.url())).status, 404);
});
