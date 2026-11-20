import assert from 'node:assert/strict';
import test from 'node:test';
import { listTemplates, loadTemplate } from '../../src/templates/catalog.js';
import { renderTemplate } from '../../src/templates/render.js';
import { parseMarkup } from '../../src/markup/parse.js';
import { readInitialData } from '../../uilib/shared/initial-data.js';

test('packaged starters expose summaries and render configured data without replacing trusted markup', async () => {
  let catalog = await listTemplates('workspace');
  assert.ok(catalog.some((entry) => entry.id === 'workspace'));
  assert.equal(catalog.some((entry) => Object.hasOwn(entry, 'html') || Object.hasOwn(entry, 'configuration')), false);
  assert.deepEqual(await listTemplates('missing-template'), []);
  let template = await loadTemplate('workspace');
  let literal = '</script><img src=x onerror=alert(1)>{{UI/inspectorOpen}}\u2028';
  let rendered = await renderTemplate('workspace', {
    APP: {
      title: literal,
    },
    DATA: {
      note: literal,
    },
  });
  assert.equal(rendered.configuration.APP.noteLabel, template.defaults.APP.noteLabel);
  assert.equal(rendered.configuration.DATA.note, literal);
  assert.doesNotMatch(rendered.html, /<img|<script[^>]+type="module"/);
  let fragment = parseMarkup(rendered.html).content;
  let app = fragment.querySelector('sym-context[ctx="APP"]');
  let data = fragment.querySelector('sym-context[ctx="DATA"]');
  assert.ok(app && data);
  assert.equal(readInitialData(app).title, literal);
  assert.equal(readInitialData(data).note, literal);
  assert.deepEqual((await renderTemplate('workspace')).configuration, template.defaults);
});

test('template configuration rejects unknown fields, executable values and invalid navigation before producing markup', async () => {
  for (let input of [
    null,
    [],
    {
      OTHER: {},
    },
    {
      APP: {
        theme: 'unknown',
      },
    },
    {
      UI: {
        inspectorOpen: 'true',
      },
    },
    {
      DATA: {
        note: () => 'code',
      },
    },
    JSON.parse('{"DATA":{"__proto__":{}}}'),
  ]) {
    await assert.rejects(renderTemplate('workspace', input), {
      code: 'INVALID_INPUT',
    });
  }
  for (let route of [
    {
      src: 'https://example.com/chunk.html',
    },
    {
      src: './_assets/../private.html',
    },
    {
      src: './_assets/%2e%2e/private.html',
    },
    {
      icon: 'missing-icon',
    },
    {
      load: 'executable-loader',
    },
    {
      default: false,
    },
  ]) {
    await assert.rejects(renderTemplate('workspace', {
      ROUTER: {
        routes: {
          workspace: {
            title: 'Workspace',
            src: './_assets/content.html',
            default: true,
            ...route,
          },
        },
      },
    }), {
      code: 'INVALID_INPUT',
    });
  }
  await assert.rejects(loadTemplate('../workspace'), /packaged template ID/);
  await assert.rejects(loadTemplate('missing'), /Unknown app template/);
});
