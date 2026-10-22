import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { temporaryState } from '../node/state-fixture.js';
import { cli, insertStdin, sendStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('explicit Save consolidates context, blocks agent loops, and recovers delivery without replay', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.', timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await cli('stop', 'feedback-browser').catch(() => {});
    await browser?.close();
    await state.close();
  });
  browser = await puppeteer.launch({ executablePath, headless: true, timeout: 10_000, protocolTimeout: 10_000 });
  let session = await cli('start', 'feedback-browser', '--no-open');
  await insertStdin('feedback-browser', await readFile(new URL('./feedback.html', import.meta.url), 'utf8'));
  let page = await browser.newPage();
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(session.url);
  await page.waitForSelector('#name input');
  await page.waitForFunction(() => Reflect.get(window, 'restoreAttempt')?.state === 'rejected');
  await page.type('#name input', 'Alex');
  await page.type('#role input', 'Engineer');
  await page.click('#save');
  await page.waitForFunction(() => Reflect.get(document.querySelector('#editor') || {}, 'result')?.failure?.code === 'DISABLED');
  assert.equal(await page.$eval('#local-name', (element) => element.textContent), 'Alex');
  assert.match(await page.$eval('#feedback-state', (element) => element.textContent || ''), /disabled/);

  let log = join(state.directory, 'deliveries.jsonl');
  let file = join(state.directory, 'feedback.json');
  let status = await cli('feedback', 'status', 'feedback-browser');
  let config = { sessionId: 'feedback-browser', instanceId: status.feedback.instanceId, conversationId: 'fixture-conversation',
    command: { executable: process.execPath, args: [fileURLToPath(new URL('../node/feedback-fixture.js', import.meta.url)), 'record', log], input: { channel: 'stdin' } } };
  await writeFile(file, JSON.stringify(config));
  await cli('feedback', 'configure', 'feedback-browser', '--file', file);
  await page.waitForFunction(() => Reflect.get(window, 'feedbackTest').PubSub.getCtx('AGUI_FEEDBACK').read('availability') === 'ready');
  await assert.rejects(readFile(log), { code: 'ENOENT' });
  await page.click('#ordinary');
  assert.ok((await cli('events', 'feedback-browser')).events.some((/** @type {{name: string}} */ event) => event.name === 'ordinary'));
  await assert.rejects(readFile(log), { code: 'ENOENT' });

  await page.click('#save');
  await page.waitForFunction(() => Reflect.get(document.querySelector('#editor') || {}, 'result')?.state === 'accepted');
  let records = (await readFile(log, 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
  assert.equal(records.length, 1);
  assert.deepEqual(records[0].event.data, { name: 'Alex', role: 'Engineer' });
  assert.equal(records[0].conversationId, config.conversationId);
  assert.equal(records[0].revision, records[0].submissionId);

  let tools = await cli('tools', 'feedback-browser');
  assert.ok(tools.tools.some((/** @type {{name: string}} */ tool) => tool.name === 'feedback_try_cached'));
  await sendStdin('call', 'feedback-browser', JSON.stringify({ pageId: tools.pageId, discoveryId: tools.discoveryId, name: 'feedback_try_cached', input: {} }));
  assert.equal(await page.$eval('#editor', (element) => Reflect.get(element, 'result').failure.code), 'AGENT_UPDATE');
  let repeated = await page.$eval('#editor', (element) => Reflect.apply(Reflect.get(element, 'commit'), element, [Reflect.get(element, 'lastUserEvent')]));
  assert.partialDeepStrictEqual(repeated, { failure: { code: 'USER_ACTION_REQUIRED' } });
  await sendStdin('update', 'feedback-browser', JSON.stringify({ selector: '#editor', values: { name: 'Agent edit' } }));
  assert.equal(await page.$eval('#name input', (element) => Reflect.get(element, 'value')), 'Agent edit');
  assert.equal((await readFile(log, 'utf8')).trim().split('\n').length, 1);

  config.command.args[1] = 'delayed-record';
  await writeFile(file, JSON.stringify(config));
  await cli('feedback', 'configure', 'feedback-browser', '--file', file);
  await page.click('#save');
  await page.waitForFunction(() => Reflect.get(window, 'feedbackTest').PubSub.getCtx('AGUI_FEEDBACK').read('pending') === 1);
  let submittedId = await page.$eval('#editor', (element) => Reflect.get(element, 'lastSubmission'));
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await page.waitForFunction(() => Reflect.get(window, 'feedbackTest').PubSub.getCtx('AGUI_FEEDBACK').read('delivery')?.state === 'unknown');
  await page.evaluate((id) => {
    let button = document.createElement('button');
    button.id = 'recover-offline';
    button.textContent = 'Check prior submission';
    button.onclick = async (userEvent) => {
      Reflect.set(window, 'recoveryAttempt', await Reflect.get(window, 'feedbackTest').submitFeedback({
        type: 'changes.submitted', source: 'feedback-editor', data: { name: 'Agent edit', role: 'Engineer' },
      }, { userEvent, submissionId: id, revision: id }));
    };
    document.querySelector('#editor')?.append(button);
  }, submittedId);
  await page.click('#recover-offline');
  await page.waitForFunction(() => Reflect.get(window, 'recoveryAttempt')?.state === 'unknown');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));
  await page.waitForFunction((id) => {
    let delivery = Reflect.get(window, 'feedbackTest').PubSub.getCtx('AGUI_FEEDBACK').read('delivery');
    return delivery?.submissionId === id && delivery.state === 'accepted';
  }, {}, submittedId);
  records = (await readFile(log, 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
  assert.equal(records.length, 2);
  assert.equal(records[1].submissionId, submittedId);
  assert.deepEqual(records[1].event.data, { name: 'Agent edit', role: 'Engineer' });

  // Each reference fits one message, but combining them exceeds the transport limit.
  let ids = [];
  for (let index of [1, 2]) {
    await page.$eval('#editor', (element, revision) => Reflect.set(element, 'revisionOverride', revision), 'Ж'.repeat(4_500) + index);
    await page.click('#save');
    ids.push(await page.$eval('#editor', (element) => Reflect.get(element, 'lastSubmission')));
  }
  await page.waitForFunction(() => Reflect.get(window, 'feedbackTest').PubSub.getCtx('AGUI_FEEDBACK').read('pending') === 2);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));
  await page.waitForFunction((id) => {
    let delivery = Reflect.get(window, 'feedbackTest').PubSub.getCtx('AGUI_FEEDBACK').read('delivery');
    return delivery?.submissionId === id && delivery.state === 'accepted';
  }, {}, ids[1]);
  records = (await readFile(log, 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
  assert.equal(records.length, 4);
  assert.deepEqual(records.slice(2).map((record) => record.submissionId), ids);
  assert.ok(records.slice(2).every((record) => record.revision.length === 4_501));
  assert.deepEqual(errors, []);
});
