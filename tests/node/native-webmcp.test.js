import assert from 'node:assert/strict';
import test from 'node:test';
import { guardNativeRegistrations } from '../../src/page/client/native-webmcp.js';

test('native registration guard preserves synchronous results, receiver, arguments, and exceptions', () => {
  let result = {};
  let options = {};
  let tool = {};
  let context = {
    registerTool(
      /** @type {unknown} */ receivedTool,
      /** @type {unknown} */ receivedOptions,
    ) {
      assert.equal(this, context);
      assert.equal(receivedTool, tool);
      assert.equal(receivedOptions, options);
      return result;
    },
  };
  guardNativeRegistrations(context);
  let wrapped = context.registerTool;
  guardNativeRegistrations(context);
  assert.equal(context.registerTool, wrapped);
  assert.equal(context.registerTool(tool, options), result);
  let failure = new Error('Registration failed');
  let throwing = {
    registerTool() { throw failure; },
  };
  guardNativeRegistrations(throwing);
  assert.throws(() => throwing.registerTool(), (error) => error === failure);
});

test('native registration guard observes expected cancellation without replacing the native promise', async () => {
  let controller = new AbortController();
  let registration = new Promise((_, reject) => controller.signal.addEventListener('abort', () => reject(controller.signal.reason), {
    once: true,
  }));
  let context = {
    registerTool(
      /** @type {unknown} */ _tool,
      /** @type {unknown} */ _options,
    ) { return registration; },
  };
  /** @type {unknown[]} */
  let errors = [];
  guardNativeRegistrations(context, (error) => errors.push(error));
  let result = context.registerTool({}, {
    signal: controller.signal,
  });
  assert.equal(result, registration);
  controller.abort();
  await assert.rejects(result, {
    name: 'AbortError',
  });
  assert.deepEqual(errors, []);
});

test('native registration guard reports genuine failures, including abort errors without an aborted signal', async () => {
  for (let failure of [
    new Error('Native registration rejected'),
    new DOMException('Unexpected cancellation', 'AbortError'),
  ]) {
    let registration = Promise.reject(failure);
    let context = {
      registerTool() { return registration; },
    };
    /** @type {unknown[]} */
    let errors = [];
    guardNativeRegistrations(context, (error) => errors.push(error));
    assert.equal(context.registerTool(), registration);
    await assert.rejects(registration, (error) => error === failure);
    assert.deepEqual(errors, [
      failure,
    ]);
  }
});
