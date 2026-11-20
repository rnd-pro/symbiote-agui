import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { listTemplates } from '../src/templates/catalog.js';
import { createTemplate } from '../src/templates/create.js';
import { SessionRuntime } from '../src/sessions/runtime.js';

let output = new URL('../src/page/gallery.assets/template-previews/', import.meta.url);
let temporary = await realpath(await mkdtemp(join(tmpdir(), 'agui-template-previews-')));
let keys = [
  'AGUI_STATE_DIR',
  'AGUI_LIBRARY_DIR',
  'AGUI_WORKER_STATE_DIR',
];
let previous = Object.fromEntries(keys.map((key) => [
  key,
  process.env[key],
]));
process.env.AGUI_STATE_DIR = temporary;
process.env.AGUI_LIBRARY_DIR = '';
delete process.env.AGUI_WORKER_STATE_DIR;
/** @type {import('puppeteer').Browser | undefined} */
let browser;
try {
  await mkdir(output, {
    recursive: true,
  });
  browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
  });
  for (let template of await listTemplates()) {
    let source = new URL(`../templates/${template.id}/preview.json`, import.meta.url);
    let example = JSON.parse(await readFile(source, 'utf8'));
    await createTemplate(template.id, template.id, example);
    let runtime = new SessionRuntime({
      sessionId: template.id,
      instanceId: randomUUID(),
      controlToken: '',
      pid: process.pid,
      launcherPid: process.pid,
    });
    let page = await browser.newPage();
    try {
      await page.setViewport({
        width: 1440,
        height: 1200,
        deviceScaleFactor: 1,
      });
      await page.emulateMediaFeatures([
        {
          name: 'prefers-reduced-motion',
          value: 'reduce',
        },
      ]);
      await runtime.start(new AbortController().signal);
      await page.goto(runtime.record.url || '');
      await page.waitForFunction(() => {
        let owner = document.querySelector('sym-context[ctx="UI"]');
        return owner && !Reflect.get(owner, '$').sectionLoading && !!document.querySelector('agui-viewport sym-import > *');
      });
      if (template.id === 'workspace') { await page.waitForSelector('textarea'); }
      if (template.id === 'collection') { await page.waitForSelector('agui-table tbody tr'); }
      if (template.id === 'dashboard') {
        await page.waitForSelector('agui-chart svg');
        await page.waitForSelector('agui-map .leaflet-container');
      }
      await page.evaluate(() => document.fonts.ready);
      await page.$$eval('agui-message', (elements) => Promise.all(elements.map((element) =>
        /** @type {import('../uilib/feedback/message/message.js').Message} */ (element).hide(true))));
      let path = new URL(`${template.id}.png`, output);
      await page.screenshot({
        path: /** @type {`${string}.png`} */ (fileURLToPath(path)),
      });
      let json = JSON.stringify(example, null, 2) + '\n';
      await writeFile(new URL(`${template.id}.json`, output), json);
      await writeFile(new URL(`${template.id}.md`, output), `\`\`\`json\n${json}\`\`\`\n`);
      process.stderr.write(`Preview generated: ${template.id}\n`);
    } finally {
      await page.close();
      await runtime.close();
    }
  }
} finally {
  await browser?.close();
  for (let key of keys) {
    if (previous[key] === undefined) { delete process.env[key]; }
    else { process.env[key] = previous[key]; }
  }
  await rm(temporary, {
    recursive: true,
    force: true,
  });
}
