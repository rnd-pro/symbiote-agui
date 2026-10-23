import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveMap, selectedMapIds, validateView, validateTiles } from '../../src/page/client/uilib/widgets/map/model.js';
import { readMap } from '../../src/page/client/uilib/widgets/map/reads.js';

/** @returns {import('../../types/uilib-map.js').UiMapState} */
function mapState() {
  return {
    rows: [
      {
        id: 'a',
        label: '<b>Alpha</b>',
        latitude: 0,
        longitude: 0,
      },
      {
        id: 'b',
        latitude: '0',
        longitude: 0,
      },
    ],
    value: [
      'a',
      'b',
    ],
    view: {
      center: [
        0,
        0,
      ],
      zoom: 2,
    },
    tiles: null,
    selection: 'multiple',
    idKey: 'id',
    latitudeKey: 'latitude',
    longitudeKey: 'longitude',
    labelKey: 'label',
    label: 'Locations',
    description: '',
    texts: {},
    disabled: false,
    readonly: false,
    loading: false,
    error: '',
  };
}

test('map records preserve zero and source IDs, skip invalid coordinates, and never rewrite records or incoming selections', () => {
  let state = mapState();
  let original = structuredClone(state);
  let model = deriveMap(state);
  assert.equal(model.points[0].latitude, 0);
  assert.equal(model.points[0].label, '<b>Alpha</b>');
  assert.equal(model.skippedCount, 1);
  assert.deepEqual(model.selected, [
    'a',
  ]);
  assert.deepEqual(state, original);
  state.rows.reverse();
  assert.equal(deriveMap(state).points[0].id, 'a');
  assert.throws(() => selectedMapIds(model, [
    'b',
  ]), /invalidState/);
  state.rows.push(state.rows[0]);
  assert.throws(() => deriveMap(state), /invalidRows/);
});

test('map rejects invalid viewports and unsafe or unsupported tile configuration', () => {
  for (let center of [
    [
      90,
      0,
    ],
    [
      0,
      181,
    ],
    [
      NaN,
      0,
    ],
  ]) {
    assert.throws(() => validateView({
      center: /** @type {[number, number]} */ (center),
      zoom: 2,
    }), /invalidState/);
  }
  let tiles = {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: 'OpenStreetMap contributors',
    attributionUrl: 'https://www.openstreetmap.org/copyright',
  };
  assert.doesNotThrow(() => validateTiles(tiles));
  for (let url of [
    'javascript:alert(1)',
    'https://user:secret@example.test/{z}/{x}/{y}.png',
    'http://example.test/{z}/{x}/{y}.png',
    'https://example.test/{s}/{z}/{x}/{y}.png',
  ]) { assert.throws(() => validateTiles({
    ...tiles,
    url,
  }), /invalidTiles/); }
  assert.throws(() => validateTiles({
    ...tiles,
    attributionUrl: 'javascript:alert(1)',
  }), /invalidTiles/);
});

test('visible map reads paginate source IDs within 8 KiB, without returning labels or records', () => {
  let state = mapState();
  let model = deriveMap(state);
  let ids = Array.from({
    length: 100,
  }, (_, index) => `${index}-${'🧪'.repeat(60)}`);
  let map = /** @type {import('../../src/page/client/uilib/widgets/map/map.js').AguiMap} */ (/** @type {unknown} */ ({
    requireModel: () => model,
    renderer: {
      view: () => model.state.view,
      visibleIds: () => ids,
    },
    paint() {},
    text: () => 'Unavailable',
  }));
  let result = readMap(map, 0, 100);
  assert.ok(Buffer.byteLength(JSON.stringify(result)) <= 8192);
  assert.ok(result.nextOffset && result.nextOffset < 100);
  assert.equal(typeof result.items[0], 'string');
  assert.throws(() => readMap(map, 0, 101), /Unavailable/);
});
