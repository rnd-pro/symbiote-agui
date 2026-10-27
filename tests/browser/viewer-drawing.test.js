import assert from 'node:assert/strict';
import test from 'node:test';
import { markerFixture, hoverMirror } from './marker-fixture.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

/** @param {import('puppeteer-core').Page} page */
async function instrument(page) {
  await page.evaluateOnNewDocument(() => {
    Reflect.set(window, 'trailPaints', 0);
    Reflect.set(window, 'annotationPackets', []);
    let stroke = CanvasRenderingContext2D.prototype.stroke;
    /**
     * @this {CanvasRenderingContext2D}
     * @param {...Path2D} paths
     */
    CanvasRenderingContext2D.prototype.stroke = function (...paths) {
      Reflect.set(window, 'trailPaints', Number(Reflect.get(window, 'trailPaints')) + 1);
      Reflect.apply(stroke, this, paths);
    };
    let Socket = WebSocket;
    Reflect.set(window, 'WebSocket', class extends Socket {
      /**
       * @param {string | URL} url
       * @param {string | string[]} [protocols]
       */
      constructor(url, protocols) {
        super(url, protocols);
        this.addEventListener('message', (event) => {
          let packet = JSON.parse(event.data);
          if (packet.type !== 'annotations') { return; }
          let packets = /** @type {import('../../types/transport.js').AnnotationServerMessage[]} */ (Reflect.get(window, 'annotationPackets'));
          packets.push(packet);
          if (packets.length > 256) { packets.shift(); }
        });
      }
    });
  });
}

/**
 * @param {import('puppeteer-core').Page} page
 * @param {'mouse' | 'pen' | 'touch'} type
 */
async function syntheticStroke(page, type) {
  await page.bringToFront();
  await page.evaluate((type) => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    let doc = frame.contentDocument;
    let box = doc?.getElementById('pointer-target')?.getBoundingClientRect();
    if (!doc || !box) { throw new Error('Missing drawing surface.'); }
    let init = {
      bubbles: true,
      cancelable: true,
      isPrimary: true,
      pointerId: 42,
      pointerType: type,
      button: 0,
      buttons: 1,
      clientX: box.left + box.width / 2,
      clientY: box.top + box.height / 2,
    };
    doc.documentElement.dispatchEvent(new PointerEvent('pointerdown', init));
    doc.documentElement.dispatchEvent(new PointerEvent('pointermove', {
      ...init,
      clientX: init.clientX + 20,
    }));
    doc.documentElement.dispatchEvent(new PointerEvent('pointercancel', {
      ...init,
      buttons: 0,
    }));
  }, type);
}

test('viewer drawing stays transient, survives snapshots, replays to late arrivals and obeys the drawing toggle for every pointer type', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 45_000,
}, async (t) => {
  let {
    browser,
    pages,
    url,
  } = await markerFixture(t);
  /** @type {string[]} */
  let errors = [];
  /** @param {boolean} viewer */
  let open = async (viewer) => {
    let page = await browser.newPage();
    page.setDefaultTimeout(8_000);
    page.on('pageerror', (error) => { errors.push(String(error)); t.diagnostic(String(error)); });
    await instrument(page);
    await page.setViewport({
      width: viewer ? 700 : 1000,
      height: 850,
    });
    await page.goto(url + (viewer ? '?mode=viewer' : ''));
    if (viewer) {
      await page.waitForFunction(() => {
        let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
        return frame?.contentDocument?.querySelector('#pointer-target[data-agui-anchor]');
      });
    } else { await page.waitForSelector('#pointer-target'); }
    return page;
  };
  let user = await open(false);
  let viewer = await open(true);
  let before = await user.$eval('context-provider[ctx="MARKER_DEMO"]', (element) => JSON.stringify(Reflect.get(element, '$').rows));
  let point = await hoverMirror(viewer, '#pointer-target');
  await viewer.mouse.move(point.x - 40, point.y);
  await viewer.mouse.down();
  await viewer.mouse.move(point.x, point.y + 8, {
    steps: 8,
  });
  await viewer.waitForFunction(() => Reflect.get(window, 'trailPaints') > 0);
  await user.$eval('#pointer-target', (element) => { element.textContent = 'Updated while drawing'; });
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    return frame.contentDocument?.getElementById('pointer-target')?.textContent === 'Updated while drawing';
  });
  await viewer.mouse.move(point.x + 50, point.y + 12, {
    steps: 12,
  });
  await viewer.mouse.up();
  await user.bringToFront();
  await user.waitForFunction(() => {
    let packets = /** @type {import('../../types/transport.js').AnnotationServerMessage[]} */ (Reflect.get(window, 'annotationPackets'));
    let last = packets.filter((entry) => entry.action === 'stroke').at(-1);
    return last?.action === 'stroke' && last.stroke.ended;
  });
  await user.waitForFunction(() => Reflect.get(window, 'trailPaints') > 0);
  assert.ok(pages.shared.annotations.strokes.size > 0);
  assert.equal(Array.from(pages.shared.annotations.strokes.values()).every((stroke) => stroke.ended), true);
  assert.equal(pages.shared.latest?.html.includes('agui-viewer-trails'), false);
  assert.equal(await user.$eval('context-provider[ctx="MARKER_DEMO"]', (element) => JSON.stringify(Reflect.get(element, '$').rows)), before);
  let late = await open(true);
  await late.waitForFunction(() => Reflect.get(window, 'trailPaints') > 0);
  let originalViewer = await viewer.evaluate(() => {
    let packets = /** @type {import('../../types/transport.js').AnnotationServerMessage[]} */ (Reflect.get(window, 'annotationPackets'));
    return packets.find((entry) => entry.action === 'state')?.self;
  });
  let lateViewer = await late.evaluate(() => {
    let packets = /** @type {import('../../types/transport.js').AnnotationServerMessage[]} */ (Reflect.get(window, 'annotationPackets'));
    return packets.find((entry) => entry.action === 'state')?.self;
  });
  assert.ok(originalViewer && lateViewer);
  assert.notEqual(originalViewer.color, lateViewer.color);
  let secondPoint = await hoverMirror(late, '#notes input');
  await late.mouse.down();
  await late.mouse.move(secondPoint.x + 20, secondPoint.y);
  await late.mouse.up();
  await late.waitForFunction((id) => {
    let packets = /** @type {import('../../types/transport.js').AnnotationServerMessage[]} */ (Reflect.get(window, 'annotationPackets'));
    return packets.some((entry) => entry.action === 'stroke' && entry.stroke.viewerId === id && entry.stroke.ended);
  }, {}, lateViewer.id);
  assert.equal(Array.from(pages.shared.annotations.strokes.values()).some((stroke) =>
    stroke.viewerId === lateViewer.id && stroke.color === lateViewer.color), true);
  await viewer.bringToFront();
  await viewer.waitForFunction((id) => {
    let packets = /** @type {import('../../types/transport.js').AnnotationServerMessage[]} */ (Reflect.get(window, 'annotationPackets'));
    return packets.some((entry) => entry.action === 'stroke' && entry.stroke.viewerId === id && entry.stroke.ended);
  }, {}, lateViewer.id);
  let knownStrokes = new Set(pages.shared.annotations.strokes.keys());
  await late.reload();
  await late.bringToFront();
  await late.waitForFunction(() => Reflect.get(window, 'trailPaints') > 0);
  let reconnected = await late.evaluate(() => {
    let packets = /** @type {import('../../types/transport.js').AnnotationServerMessage[]} */ (Reflect.get(window, 'annotationPackets'));
    return packets.find((entry) => entry.action === 'state')?.self;
  });
  assert.ok(reconnected);
  assert.notEqual(reconnected.id, lateViewer.id);
  assert.equal(Array.from(pages.shared.annotations.members.values()).some((member) => member.presence.id === lateViewer.id), false);
  assert.equal(Array.from(pages.shared.annotations.strokes.keys()).every((id) => knownStrokes.has(id)), true, 'Reconnect replays server history without publishing old input.');
  await viewer.bringToFront();
  await viewer.click('agui-data-toolbar .agui-data-trigger');
  await viewer.waitForSelector('agui-data-toolbar .agui-data-panel agui-toggle:not([hidden]) input');
  let toggleSelector = 'agui-data-toolbar .agui-data-panel agui-toggle input';
  assert.equal(await viewer.$eval(toggleSelector, (element) => Reflect.get(element, 'checked')), true, 'Drawing defaults to enabled.');
  await viewer.click('agui-data-toolbar .agui-data-panel agui-toggle input');
  await viewer.click('agui-data-toolbar .agui-data-trigger');
  let previous = new Set(pages.shared.annotations.strokes.keys());
  for (let type of /** @type {const} */ ([
    'mouse',
    'pen',
    'touch',
  ])) { await syntheticStroke(viewer, type); }
  await viewer.evaluate(() => new Promise((resolve) => setTimeout(resolve, 100)));
  assert.equal(Array.from(pages.shared.annotations.strokes.keys()).some((id) => !previous.has(id)), false, 'Disabled drawing blocks mouse, pen and touch strokes.');
  await hoverMirror(viewer, '#pointer-target');
  await user.bringToFront();
  await user.waitForSelector(`[data-viewer="${originalViewer.id}"] agui-icon`);
  await user.$eval('#pointer-target', (element) => { element.textContent = 'Updated with drawing disabled'; });
  await viewer.bringToFront();
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    return frame.contentDocument?.getElementById('pointer-target')?.textContent === 'Updated with drawing disabled';
  });
  assert.equal(await viewer.$eval(toggleSelector, (element) => Reflect.get(element, 'checked')), false, 'Snapshots preserve the disabled mode.');
  await viewer.click('agui-data-toolbar .agui-data-trigger');
  await viewer.click(toggleSelector);
  await viewer.click('agui-data-toolbar .agui-data-trigger');
  let start = Math.max(0, ...Array.from(pages.shared.annotations.strokes.values(), (stroke) => stroke.startSequence));
  await syntheticStroke(viewer, 'touch');
  await viewer.waitForFunction((start) => {
    let packets = /** @type {import('../../types/transport.js').AnnotationServerMessage[]} */ (Reflect.get(window, 'annotationPackets'));
    return packets.some((entry) => entry.action === 'stroke' && entry.stroke.startSequence > start && entry.stroke.ended);
  }, {}, start);
  start = Math.max(...Array.from(pages.shared.annotations.strokes.values(), (stroke) => stroke.startSequence));
  await hoverMirror(viewer, '#pointer-target');
  await viewer.mouse.down();
  await viewer.mouse.move(point.x + 20, point.y);
  await viewer.waitForFunction((start) => {
    let packets = /** @type {import('../../types/transport.js').AnnotationServerMessage[]} */ (Reflect.get(window, 'annotationPackets'));
    return packets.some((entry) => entry.action === 'stroke' && entry.stroke.startSequence > start && !entry.stroke.ended);
  }, {}, start);
  // Toggle through the native control while the mouse is still held down.
  await viewer.$eval(toggleSelector, (element) => /** @type {HTMLInputElement} */ (element).click());
  await viewer.waitForFunction((start) => {
    let packets = /** @type {import('../../types/transport.js').AnnotationServerMessage[]} */ (Reflect.get(window, 'annotationPackets'));
    return packets.some((entry) => entry.action === 'stroke' && entry.stroke.startSequence > start && entry.stroke.ended);
  }, {}, start);
  previous = new Set(pages.shared.annotations.strokes.keys());
  await viewer.mouse.move(point.x + 40, point.y);
  await viewer.mouse.up();
  await viewer.evaluate(() => new Promise((resolve) => setTimeout(resolve, 100)));
  assert.equal(Array.from(pages.shared.annotations.strokes.keys()).some((id) => !previous.has(id)), false, 'Disabling ends the active stroke and does not resume it while the pointer stays held.');
  await user.bringToFront();
  assert.equal(await user.$eval('#notes input', (element) => Reflect.get(element, 'value')), 'Preserve this value');
  assert.equal(await viewer.evaluate(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    return frame.contentDocument?.body.inert && !frame.contentWindow?.customElements.get('agui-field');
  }), true);
  await user.$eval('#pointer-target', (element) => element.remove());
  await viewer.bringToFront();
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    return !frame.contentDocument?.getElementById('pointer-target');
  });
  assert.equal(Array.from(pages.shared.annotations.strokes.values()).some((stroke) =>
    stroke.points.some((strokePoint) => strokePoint.anchor === point.anchor)), false);
  await viewer.close();
  await late.close();
  let expires = Math.max(...Array.from(pages.shared.annotations.strokes.values(), (stroke) => stroke.expiresAt));
  await user.waitForFunction((expires) => Date.now() > expires + 300, {}, expires);
  assert.equal(pages.shared.annotations.strokes.size, 0);
  let paints = await user.evaluate(() => Number(Reflect.get(window, 'trailPaints')));
  await user.evaluate(() => new Promise((resolve) => window.setTimeout(resolve, 150)));
  assert.equal(await user.evaluate(() => Number(Reflect.get(window, 'trailPaints'))), paints, 'Expired trails no longer trigger canvas strokes.');
  assert.equal(await user.$eval('context-provider[ctx="MARKER_DEMO"]', (element) => JSON.stringify(Reflect.get(element, '$').rows)), before);
  assert.deepEqual(errors, []);
});
