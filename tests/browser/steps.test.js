import assert from 'node:assert/strict';
import test from 'node:test';
import puppeteer from 'puppeteer';
import { temporaryState } from '../node/state-fixture.js';
import { cli, insertStdin } from './helpers.js';

test('steps keep their rendered items when list and current value change together during navigation', {
  timeout: 60000,
}, async (t) => {
  let state = await temporaryState();
  /** @type {import('puppeteer').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await cli('stop', 'steps').catch(() => {});
    await state.close();
  });
  let session = await cli('start', 'steps', '--no-open');
  await insertStdin('steps', `
    <sym-context ctx="PROGRESS">
      <script type="application/json">
        {
          "visible": false,
          "items": [
            { "value": "draft", "label": "Draft" },
            { "value": "review", "label": "Review" },
            { "value": "done", "label": "Done" }
          ],
          "value": "draft",
          "texts": { "invalidValue": "Choose an existing step." }
        }
      </script>
      <sym-conditional when="PROGRESS/visible">
        <agui-panel>
          <agui-steps label="Progress"
            bind="$.items: PROGRESS/items; $.value: PROGRESS/value; $.texts: PROGRESS/texts"></agui-steps>
        </agui-panel>
      </sym-conditional>
    </sym-context>
  `);
  browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
  });
  let page = await browser.newPage();
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(session.url);
  await page.waitForSelector('agui-steps li');
  for (let visit = 0; visit < 3; visit++) {
    await page.$eval('sym-context', (owner, visit) => {
      let prefix = `visit-${visit}`;
      /** @type {import('@symbiotejs/symbiote/html-app').SymContext} */ (owner).$ = {
        items: [
          {
            value: `${prefix}-start`,
            label: 'Start',
          },
          {
            value: `${prefix}-finish`,
            label: 'Finish',
          },
        ],
        value: `${prefix}-finish`,
        visible: true,
      };
    }, visit);
    await page.waitForFunction(() => {
      let steps = document.querySelector('agui-steps');
      return steps && Reflect.get(steps, '$').entries.length === 2;
    });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.waitForFunction(() => !document.querySelector('agui-steps [leaving]'));
    assert.deepEqual(await page.$$eval('agui-steps .agui-step-label', (labels) => labels.map((label) => label.textContent)), [
      'Start',
      'Finish',
    ]);
    assert.equal(await page.$eval('agui-steps li[aria-current="step"] .agui-step-label', (label) => label.textContent), 'Finish');
    await page.$eval('sym-context', (owner) => { Reflect.get(owner, '$').visible = false; });
  }
  assert.deepEqual(errors, []);
});
